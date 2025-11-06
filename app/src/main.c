#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/drivers/display.h>
#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/display/cfb.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/smf.h>
#include <zephyr/input/input.h>
#include <zephyr/types.h>
#include <zephyr/sys/byteorder.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/hci.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/uuid.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/shell/shell.h>
#include <zephyr/drivers/led_strip.h>
#include <string.h>
#define LOG_LEVEL LOG_LEVEL_DGB
LOG_MODULE_REGISTER(badge_shell);

#define STRIP_NODE  DT_ALIAS(led_strip)
#if !DT_NODE_HAS_STATUS(STRIP_NODE, okay)
#error "LED strip device not defined in devicetree"
#endif

#define STRIP_NUM_PIXELS DT_PROP(STRIP_NODE, chain_length)
#define RGB(_r, _g, _b) ((struct led_rgb) { .r = (_r), .g = (_g), .b = (_b)})
static const struct device *const strip = DEVICE_DT_GET(STRIP_NODE);
static struct led_rgb pixels[STRIP_NUM_PIXELS];
static struct k_work led_blink_work;
static int led_index = 0;
static void set_led_color(struct led_rgb color)
{
  for (int i = 0; i < STRIP_NUM_PIXELS; i++){
    pixels[i] = color;
  }
  int rc = led_strip_update_rgb(strip, pixels, STRIP_NUM_PIXELS);
  if(rc){
    LOG_ERR("led strip update failed: %d",rc);
  }
}
static struct led_rgb colors[] = {
    {0x0F, 0x00, 0x00}, // Red
    {0x00, 0x0F, 0x00}, // green 
    {0x00, 0x00, 0x0F}  // blue
};

void led_blink_work_handler(struct k_work *work)
{
    set_led_color(colors[led_index]); // LED color change
    led_index++;
    if (led_index >= ARRAY_SIZE(colors))
        led_index = 0;
}
void led_blink_timer_handler(struct k_timer *timer_id)
{
    k_work_submit(&led_blink_work);
}
// Timer define
static K_TIMER_DEFINE(led_blink_timer, led_blink_timer_handler, NULL);
static struct led_rgb blink_color;
static bool blinking = false;

// cmd_led 
static int cmd_led(const struct shell *shell, size_t argc, char **argv)
{
    if (argc < 2) {
        shell_print(shell, "Usage:");
        shell_print(shell, "  led <r> <g> <b>           set led to a particular color");
        shell_print(shell, "  led <r> <g> <b> <delay>   Blink color every <delay> ms");
        shell_print(shell, "  led off                   Turn off LED");
        return -EINVAL;
    }

    // Case 1: "led off"
    if (strcmp(argv[1], "off") == 0) {
        k_timer_stop(&led_blink_timer);
        blinking = false;
        set_led_color(RGB(0, 0, 0));
        shell_print(shell, "LED turned off");
        return 0;
    }

    // Must have at least 4 args for RGB
    if (argc < 4) {
        shell_error(shell, "Usage: led <r> <g> <b> [delay_ms]");
        return -EINVAL;
    }

    char *endptr;
    long r = strtol(argv[1], &endptr, 10);
    if (*endptr != '\0' || r < 0 || r > 255) {
        shell_error(shell, "Invalid red value (0-255)");
        return -EINVAL;
    }
    long g = strtol(argv[2], &endptr, 10);
    if (*endptr != '\0' || g < 0 || g > 255) {
        shell_error(shell, "Invalid green value (0-255)");
        return -EINVAL;
    }
    long b = strtol(argv[3], &endptr, 10);
    if (*endptr != '\0' || b < 0 || b > 255) {
        shell_error(shell, "Invalid blue value (0-255)");
        return -EINVAL;
    }

    struct led_rgb color = RGB((uint8_t)r, (uint8_t)g, (uint8_t)b);

    // Case 2: "led R G B" (static color)
    if (argc == 4) {
        k_timer_stop(&led_blink_timer);
        blinking = false;
        set_led_color(color);
        shell_print(shell, "LED set to R=%ld G=%ld B=%ld", r, g, b);
        return 0;
    }

    // Case 3: "led R G B delay" (blink)
    long delay = strtol(argv[4], &endptr, 10);
    if (*endptr != '\0' || delay <= 0) {
        shell_error(shell, "Invalid delay (ms)");
        return -EINVAL;
    }

    blink_color = color;
    blinking = true;
    k_timer_stop(&led_blink_timer);
    k_timer_start(&led_blink_timer, K_MSEC(delay), K_MSEC(delay));

    shell_print(shell, "LED blinking R=%ld G=%ld B=%ld every %ld ms", r, g, b, delay);
    return 0;
}

// Register shell command
SHELL_CMD_REGISTER(led, NULL, "LED control: led <r> <g> <b> [delay] | led off", cmd_led);
static const struct smf_state badge_states[];

enum badge_state {
  BADGE_STATE_INIT,
  BADGE_STATE_IDLE,
  BADGE_STATE_ERROR,
};

enum badge_event {
  BADGE_EVENT_DISPLAY_ERROR,
  BADGE_EVENT_BLE_ERROR,
  BADGE_EVENT_SHORT_BUTTON_PRESS,
  BADGE_EVENT_LONG_BUTTON_PRESS,
};

// Forward declarations
void display_text(char* text);
void gen_event(enum badge_event event);

struct global_context{
  int64_t button_press_time;
} gc;

K_MSGQ_DEFINE(event_msgq, sizeof(enum badge_event), 10,1);

struct s_object {
  struct smf_ctx ctx;
  enum badge_event event;
}s_obj;

const struct device *display_dev;

// Define work queue for display operations
K_THREAD_STACK_DEFINE(display_stack, 1024);
struct k_work_q display_work_q;

// Structure to hold display text work
struct display_work_item {
    struct k_work work;
    char text[32];
    bool update_text;
};

// Create a single work item that we'll reuse
static struct display_work_item display_item;

// BLE service UUIDs
#define BADGE_SERVICE_UUID 0x1234
#define BADGE_CHARACTERISTIC_UUID 0x5678

// BLE service data
static uint8_t badge_data[32] = "Makerville Badge";

// Read callback for the characteristic
static ssize_t read_badge_data(struct bt_conn *conn,
                             const struct bt_gatt_attr *attr,
                             void *buf, uint16_t len, uint16_t offset)
{
    return bt_gatt_attr_read(conn, attr, buf, len, offset, badge_data,
                            strlen(badge_data));
}

// Write callback for the characteristic
static ssize_t write_badge_data(struct bt_conn *conn,
                              const struct bt_gatt_attr *attr,
                              const void *buf, uint16_t len, uint16_t offset,
                              uint8_t flags)
{
    if (offset + len > sizeof(badge_data)) {
        return BT_GATT_ERR(BT_ATT_ERR_INVALID_OFFSET);
    }

    memcpy(badge_data + offset, buf, len);
    badge_data[len] = '\0';  // Ensure null termination

    LOG_INF("Received data: %s", badge_data);
    display_text(badge_data);
    return len;
}

static struct bt_gatt_attr attrs[] = {
    BT_GATT_PRIMARY_SERVICE(BT_UUID_DECLARE_16(BADGE_SERVICE_UUID)),
    BT_GATT_CHARACTERISTIC(BT_UUID_DECLARE_16(BADGE_CHARACTERISTIC_UUID),
                          BT_GATT_CHRC_READ | BT_GATT_CHRC_WRITE,
                          BT_GATT_PERM_READ | BT_GATT_PERM_WRITE,
                          read_badge_data, write_badge_data, badge_data),
};

static struct bt_gatt_service badge_service = {
    .attrs = attrs,
    .attr_count = ARRAY_SIZE(attrs),
};

// Helper function to start advertising
static int start_advertising(void)
{
    int err;

    // Stop any existing advertising first
    err = bt_le_adv_stop();
    if (err) {
        LOG_ERR("Failed to stop advertising (err %d)", err);
        // Continue anyway as we want to try starting
    }

    struct bt_le_adv_param param = {
        .id = 0,
        .sid = 0,
        .secondary_max_skip = 0,
        .options = BT_LE_ADV_OPT_CONN  | BT_LE_ADV_OPT_USE_NAME,
        .interval_min = BT_GAP_ADV_FAST_INT_MIN_2,
        .interval_max = BT_GAP_ADV_FAST_INT_MAX_2,
        .peer = NULL,
    };
    /* wait for 1 second */
    k_msleep(1000);
    err = bt_le_adv_start(&param, NULL, 0, NULL, 0);
    if (err) {
        LOG_ERR("Advertising failed to start (err %d)", err);
        return err;
    }

    LOG_INF("Advertising started");
    return 0;
}

// BLE connection callback
static void connected(struct bt_conn *conn, uint8_t err)
{
    if (err) {
        LOG_ERR("Connection failed (err %u)", err);
        gen_event(BADGE_EVENT_BLE_ERROR);
    } else {
        LOG_INF("Connected");
    }
}

static void disconnected(struct bt_conn *conn, uint8_t reason)
{
    LOG_INF("Disconnected (reason %u)", reason);

    // Restart advertising
    int err = start_advertising();
    if (err) {
        LOG_ERR("Failed to restart advertising (err %d)", err);
        gen_event(BADGE_EVENT_BLE_ERROR);
    }
}

BT_CONN_CB_DEFINE(conn_callbacks) = {
    .connected = connected,
    .disconnected = disconnected,
};

// BLE initialization function
static int ble_init(void)
{
    int err;

    err = bt_enable(NULL);
    if (err) {
        LOG_ERR("Bluetooth init failed (err %d)", err);
        gen_event(BADGE_EVENT_BLE_ERROR);
        return err;
    }

    LOG_INF("Bluetooth initialized");

    err = bt_gatt_service_register(&badge_service);
    if (err) {
        LOG_ERR("Service registration failed (err %d)", err);
        gen_event(BADGE_EVENT_BLE_ERROR);
        return err;
    }

    return start_advertising();
}

/* Send a message to the display thread */
void message_display_thread(char* text)
{
  LOG_INF("Message display thread");
}

void gen_event(enum badge_event event)
{
  k_msgq_put(&event_msgq, (void*)&event, K_NO_WAIT);
}

int display_init()
{
  uint16_t x_res;
	uint16_t y_res;
	uint16_t rows;
	uint8_t ppt;

	if (display_set_pixel_format(display_dev, PIXEL_FORMAT_MONO10) != 0) {
		if (display_set_pixel_format(display_dev, PIXEL_FORMAT_MONO01) != 0) {
			printf("Failed to set required pixel format");
			return 0;
		}
	}

	printf("Initialized %s\n", display_dev->name);

	if (cfb_framebuffer_init(display_dev)) {
		printf("Framebuffer initialization failed!\n");
		return 0;
	}

	cfb_framebuffer_clear(display_dev, true);

	display_blanking_off(display_dev);

	x_res = cfb_get_display_parameter(display_dev, CFB_DISPLAY_WIDTH);
	y_res = cfb_get_display_parameter(display_dev, CFB_DISPLAY_HEIGHT);
	rows = cfb_get_display_parameter(display_dev, CFB_DISPLAY_ROWS);
	ppt = cfb_get_display_parameter(display_dev, CFB_DISPLAY_PPT);

	/* for (int idx = 0; idx < 42; idx++) { */
	/* 	if (cfb_get_font_size(display_dev, idx, &font_width, &font_height)) { */
	/* 		break; */
	/* 	} */
	/* 	cfb_framebuffer_set_font(display_dev, idx); */
	/* 	printf("font width %d, font height %d\n", */
	/* 	       font_width, font_height); */
  /*   if (idx==2) */
  /*     break; */
	/* } */
  cfb_framebuffer_set_font(display_dev, 2);

	printf("x_res %d, y_res %d, ppt %d, rows %d, cols %d\n",
	       x_res,
	       y_res,
	       ppt,
	       rows,
	       cfb_get_display_parameter(display_dev, CFB_DISPLAY_COLS));

	/* cfb_framebuffer_invert(display_dev); */

	cfb_set_kerning(display_dev, 0);
  return 0;
}

void display_work_handler(struct k_work *work)
{
    struct display_work_item *display_item = CONTAINER_OF(work, struct display_work_item, work);
    int x_res = cfb_get_display_parameter(display_dev, CFB_DISPLAY_WIDTH);
    int text_len = strlen(display_item->text);
    int char_width = 20; // Approximate width of each character
    int total_width = text_len * char_width;
    int x_pos = x_res; // Start from right edge

    // Clear the display once at the start
    cfb_framebuffer_clear(display_dev, true);

    while (1) {
        // Only clear the area that needs updating
        cfb_framebuffer_clear(display_dev, false);

        // Scroll the text from right to left
        while (x_pos > -total_width) {
            // Clear only the area that needs updating
            cfb_framebuffer_clear(display_dev, false);
            cfb_print(display_dev, display_item->text, x_pos, 0);
            cfb_framebuffer_finalize(display_dev);
            x_pos -= 4; // Faster scroll speed
            k_msleep(10); // Shorter delay between updates
        }

        // Reset position for next iteration
        x_pos = x_res;

        // If text was updated, break the loop to restart with new text
        if (display_item->update_text) {
            display_item->update_text = false;
            // Clear the display for the new text
            cfb_framebuffer_clear(display_dev, true);
            break;
        }
    }

    // Resubmit the work to continue scrolling
    k_work_submit_to_queue(&display_work_q, &display_item->work);
}

void display_text(char* text)
{
    // Copy the text to the work item
    strncpy(display_item.text, text, sizeof(display_item.text) - 1);
    display_item.text[sizeof(display_item.text) - 1] = '\0';
    display_item.update_text = true;

    // Submit the work to the display queue
    k_work_submit_to_queue(&display_work_q, &display_item.work);
}

int index;
#define MAX_STRINGS 3
char text[MAX_STRINGS][32]= {
  "Anuj Deshpande",
  "anujdeshpande.com",
  "Interested in developer tools!"
};

void badge_init_entry(void* arg)
{
  LOG_INF("Badge init entry");
  if (!device_is_ready(strip)){
    LOG_ERR("LED strip not ready");
    return;
  }
  // Initialize display work queue
  k_work_queue_init(&display_work_q);
  k_work_queue_start(&display_work_q, display_stack, K_THREAD_STACK_SIZEOF(display_stack),
                    K_PRIO_COOP(7), NULL);

  // Initialize display work item
  k_work_init(&display_item.work, display_work_handler);
  display_item.update_text = false;

  display_dev = DEVICE_DT_GET(DT_CHOSEN(zephyr_display));
  if (!device_is_ready(display_dev)) {
    printk("Display_Device %s not ready\n", display_dev->name);
    smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_ERROR]);
    gen_event(BADGE_EVENT_DISPLAY_ERROR);
    return;
  }

  LOG_INF("SSD1306 device found\n");
  display_init();

  // Initialize Bluetooth
  int err = ble_init();
  if (err) {
    LOG_ERR("Bluetooth initialization failed");
    smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_ERROR]);
    gen_event(BADGE_EVENT_BLE_ERROR);
    return;
  }

  smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_IDLE]);
}

void badge_init_exit(void* arg)
{
  LOG_INF("Badge init exit");
}

void badge_idle_entry(void* arg)
{
  LOG_INF("Badge idle entry");
  display_text("Makerville Badge!");
}

enum smf_state_result badge_idle_run(void* arg)
{
  struct s_object *obj = (struct s_object *)arg;

  switch(obj->event) {
    case BADGE_EVENT_SHORT_BUTTON_PRESS:
      LOG_INF("Short button pressed when IDLE");
      display_text("Short button press");
      break;
    case BADGE_EVENT_LONG_BUTTON_PRESS:
      LOG_INF("Long button pressed when IDLE");
      display_text("Long button press");
      break;
    case BADGE_EVENT_BLE_ERROR:
      smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_ERROR]);
      gen_event(BADGE_EVENT_BLE_ERROR);
      break;
    default:
      LOG_INF("Unhandled event in idle state %d", obj->event);
      break;
  }
}

void badge_idle_exit(void* arg)
{
  LOG_INF("Badge idle exit");
}

void badge_error_entry(void* arg)
{
  LOG_INF("Badge error entry");
}

void badge_error_run(void* arg)
{

  struct s_object *obj = (struct s_object *)arg;
  switch(obj->event) {
    case BADGE_EVENT_DISPLAY_ERROR:
      LOG_INF("Display error - can only show this");
      break;
    case BADGE_EVENT_BLE_ERROR:
      display_text("BLE error");
      break;
    default:
      LOG_INF("Unhandled event in error state %d", obj->event);
      break;
  }
}

void badge_error_exit(void* arg)
{
  LOG_INF("Badge error exit");
}

static const struct smf_state badge_states[] = {
  [BADGE_STATE_INIT] = SMF_CREATE_STATE(badge_init_entry, NULL, NULL,NULL,NULL),
  [BADGE_STATE_IDLE] = SMF_CREATE_STATE(badge_idle_entry, badge_idle_run, badge_idle_exit,NULL,NULL),
  [BADGE_STATE_ERROR] = SMF_CREATE_STATE(badge_error_entry, badge_error_run, badge_error_exit,NULL,NULL),
};

void input_cb(struct input_event *event, void *cb_arg)
{
    if (event->type == INPUT_EV_KEY) {
        if (event->code == INPUT_KEY_0) {
            if (event->value == 1) {
                // Button pressed
                LOG_INF("Button pressed");
                gc.button_press_time = k_uptime_get();
            } else if (event->value == 0) {
                // Button released
                LOG_INF("Button released");
                int64_t press_duration = k_uptime_get() - gc.button_press_time;
                if(press_duration > 1000) {
                  LOG_INF("Long button press");
                  gen_event(BADGE_EVENT_LONG_BUTTON_PRESS);
                } else {
                  LOG_INF("Short button press");
                  gen_event(BADGE_EVENT_SHORT_BUTTON_PRESS);
                }
            }
        }
    }
}

INPUT_CALLBACK_DEFINE(NULL, input_cb,NULL);
int main(void)
{
  int32_t ret;
  int rc;
  
  set_led_color(RGB(0x0F, 0x0F, 0x0F)); // Default: white
  k_work_init(&led_blink_work, led_blink_work_handler);
  k_timer_stop(&led_blink_timer);
  smf_set_initial(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_INIT]);
  while(1) {
    rc = k_msgq_get(&event_msgq, &s_obj.event, K_NO_WAIT);
    if(rc == 0) {
      ret = smf_run_state(SMF_CTX(&s_obj));
      if (ret != 0) {
        LOG_ERR("SMF error: %d", ret);
      }
    }
    k_msleep(10);
  }
  return 0;
}
