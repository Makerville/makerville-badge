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


#define LOG_LEVEL LOG_LEVEL_DBG
LOG_MODULE_REGISTER(badge_shell, LOG_LEVEL);


/* LED STRIP SETUP */
#define STRIP_NODE        DT_ALIAS(led_strip)
#if !DT_NODE_HAS_STATUS(STRIP_NODE, okay)
#error "LED strip device not defined in device tree with alias led_strip"
#endif


#define STRIP_NUM_PIXELS  DT_PROP(STRIP_NODE, chain_length)
#define LED_DELAY         K_MSEC(600)
#define RGB(_r,_g,_b)     ((struct led_rgb){ .r = (_r), .g = (_g), .b = (_b) })


static const struct device *strip = DEVICE_DT_GET(STRIP_NODE);
static struct led_rgb pixels[STRIP_NUM_PIXELS];


static void set_led_color(struct led_rgb color)
{
 for (int i = 0; i < STRIP_NUM_PIXELS; i++) {
     pixels[i] = color;
 }
 int rc = led_strip_update_rgb(strip, pixels, STRIP_NUM_PIXELS);
 if (rc) {
     LOG_ERR("led_strip_update_rgb failed: %d", rc);
 } else {
     LOG_DBG("LED color set R=%u G=%u B=%u", color.r, color.g, color.b);
 }
}


/* Badge / Display / BLE / State Machine Setup  */
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


void display_text(char *text);
void gen_event(enum badge_event event);


struct global_context {
 int64_t button_press_time;
} gc;


K_MSGQ_DEFINE(event_msgq, sizeof(enum badge_event), 10, 1);


struct s_object {
 struct smf_ctx ctx;
 enum badge_event event;
} s_obj;


const struct device *display_dev;


K_THREAD_STACK_DEFINE(display_stack, 1024);
struct k_work_q display_work_q;


struct display_work_item {
 struct k_work work;
 char text[32];
 bool update_text;
};
static struct display_work_item display_item;


/* BLE service definitions */
#define BADGE_SERVICE_UUID        0x1234
#define BADGE_CHARACTERISTIC_UUID 0x5678


static uint8_t badge_data[32] = "Makerville Badge";


/* read */
static ssize_t read_badge_data(struct bt_conn *conn,
                              const struct bt_gatt_attr *attr,
                              void *buf, uint16_t len, uint16_t offset)
{
   return bt_gatt_attr_read(conn, attr, buf, len, offset, badge_data,
                            strlen(badge_data));
}


/* write */
static ssize_t write_badge_data(struct bt_conn *conn,
                               const struct bt_gatt_attr *attr,
                               const void *buf, uint16_t len, uint16_t offset,
                               uint8_t flags)
{
 if (offset + len > sizeof(badge_data)) {
     return BT_GATT_ERR(BT_ATT_ERR_INVALID_OFFSET);
 }
 memcpy(badge_data + offset, buf, len);
 badge_data[offset + len] = '\0';
 LOG_INF("Received via BLE: %s", badge_data);
 display_text((char *)badge_data);
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


static int start_advertising(void)
{
 int err = bt_le_adv_stop();
 if (err) {
   LOG_WRN("bt_le_adv_stop returned %d", err);
 }


 struct bt_le_adv_param adv_params = {
   .id = 0,
   .sid = 0,
   .secondary_max_skip = 0,
   .options = BT_LE_ADV_OPT_CONN | BT_LE_ADV_OPT_USE_NAME,
   .interval_min = BT_GAP_ADV_FAST_INT_MIN_2,
   .interval_max = BT_GAP_ADV_FAST_INT_MAX_2,
   .peer = NULL,
 };


 k_msleep(1000);


 err = bt_le_adv_start(&adv_params, NULL, 0, NULL, 0);
 if (err) {
   LOG_ERR("bt_le_adv_start failed: %d", err);
   return err;
 }
 LOG_INF("Advertising started");
 return 0;
}


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
 int err = start_advertising();
 if (err) {
   LOG_ERR("Failed to restart advertising: %d", err);
   gen_event(BADGE_EVENT_BLE_ERROR);
 }
}


BT_CONN_CB_DEFINE(conn_callbacks) = {
 .connected = connected,
 .disconnected = disconnected,
};


static int ble_init(void)
{
 int err = bt_enable(NULL);
 if (err) {
   LOG_ERR("bt_enable failed: %d", err);
   gen_event(BADGE_EVENT_BLE_ERROR);
   return err;
 }


 LOG_INF("Bluetooth initialized");


 err = bt_gatt_service_register(&badge_service);
 if (err) {
   LOG_ERR("gatt service register failed: %d", err);
   gen_event(BADGE_EVENT_BLE_ERROR);
   return err;
 }


 return start_advertising();
}


/* event generator */
void gen_event(enum badge_event event)
{
 k_msgq_put(&event_msgq, &event, K_NO_WAIT);
}


/* Display / text functions */
int display_init(void)
{
 if (display_set_pixel_format(display_dev, PIXEL_FORMAT_MONO10) != 0 &&
   display_set_pixel_format(display_dev, PIXEL_FORMAT_MONO01) != 0) {
   printk("Failed to set pixel format\n");
   return -1;
 }


 if (cfb_framebuffer_init(display_dev)) {
   printk("Framebuffer init failed\n");
   return -1;
 }


 cfb_framebuffer_clear(display_dev, true);
 display_blanking_off(display_dev);
 cfb_framebuffer_set_font(display_dev, 2);
 cfb_set_kerning(display_dev, 0);
 return 0;
}


void display_work_handler(struct k_work *work)
{
 struct display_work_item *item = CONTAINER_OF(work, struct display_work_item, work);
 int x_res = cfb_get_display_parameter(display_dev, CFB_DISPLAY_WIDTH);
 int text_len = strlen(item->text);
 int total_width = text_len * 8; 
 int x_pos = x_res;


 cfb_framebuffer_clear(display_dev, true);


 while (1) {
   cfb_framebuffer_clear(display_dev, false);
   while (x_pos > -total_width) {
     cfb_framebuffer_clear(display_dev, false);
     cfb_print(display_dev, item->text, x_pos, 0);
     cfb_framebuffer_finalize(display_dev);
     x_pos -= 2;
     k_msleep(10);
   }
   x_pos = x_res;
   if (item->update_text) {
     item->update_text = false;
     cfb_framebuffer_clear(display_dev, true);
     break;
   }
 }


 k_work_submit_to_queue(&display_work_q, &item->work);
}


void display_text(char *text)
{
 strncpy(display_item.text, text, sizeof(display_item.text) - 1);
 display_item.text[sizeof(display_item.text) - 1] = '\0';
 display_item.update_text = true;
 k_work_submit_to_queue(&display_work_q, &display_item.work);
}


/* State machine callbacks */
void badge_init_entry(void *arg)
{
 LOG_INF("Badge init entry");


 k_work_queue_init(&display_work_q);
 k_work_queue_start(&display_work_q, display_stack, K_THREAD_STACK_SIZEOF(display_stack),
                     K_PRIO_COOP(7), NULL);


 k_work_init(&display_item.work, display_work_handler);
 display_item.update_text = false;


 display_dev = DEVICE_DT_GET(DT_CHOSEN(zephyr_display));
 if (!device_is_ready(display_dev)) {
   printk("Display device %s not ready\n", display_dev->name);
   smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_ERROR]);
   gen_event(BADGE_EVENT_DISPLAY_ERROR);
   return;
 }


 if (display_init() != 0) {
   smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_ERROR]);
   gen_event(BADGE_EVENT_DISPLAY_ERROR);
   return;
 }


 if (ble_init() != 0) {
   LOG_ERR("BLE init failed");
   smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_ERROR]);
   gen_event(BADGE_EVENT_BLE_ERROR);
   return;
 }


 smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_IDLE]);
}


void badge_idle_entry(void *arg)
{
 LOG_INF("Badge idle entry");
 display_text("Makerville Badge");
}


void badge_idle_run(void *arg)
{
 struct s_object *obj = (struct s_object *)arg;
 switch (obj->event) {
 case BADGE_EVENT_SHORT_BUTTON_PRESS:
   display_text("Short press");
   break;
 case BADGE_EVENT_LONG_BUTTON_PRESS:
   display_text("Long press");
   break;
 case BADGE_EVENT_BLE_ERROR:
   smf_set_state(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_ERROR]);
   gen_event(BADGE_EVENT_BLE_ERROR);
   break;
 default:
   break;
 }
}


void badge_error_entry(void *arg)
{
 LOG_INF("Badge error entry");
 display_text("ERROR");
}


void badge_error_run(void *arg)
{
 struct s_object *obj = (struct s_object *)arg;
 switch (obj->event) {
 case BADGE_EVENT_DISPLAY_ERROR:
   display_text("DISP ERROR");
   break;
 case BADGE_EVENT_BLE_ERROR:
   display_text("BLE ERROR");
   break;
 default:
   break;
 }
}


static const struct smf_state badge_states[] = {
 [BADGE_STATE_INIT]  = SMF_CREATE_STATE(badge_init_entry, NULL, NULL, NULL, NULL),
 [BADGE_STATE_IDLE]  = SMF_CREATE_STATE(badge_idle_entry, badge_idle_run, NULL, NULL, NULL),
 [BADGE_STATE_ERROR] = SMF_CREATE_STATE(badge_error_entry, badge_error_run, NULL, NULL, NULL),
};


/* Button / input callback */
void input_cb(struct input_event *event, void *cb_arg)
{
 if (event->type == INPUT_EV_KEY && event->code == INPUT_KEY_0) {
   if (event->value == 1) {
       gc.button_press_time = k_uptime_get();
     } else if (event->value == 0) {
       int64_t dur = k_uptime_get() - gc.button_press_time;
       if (dur > 1000) {
         gen_event(BADGE_EVENT_LONG_BUTTON_PRESS);
       } else {
         gen_event(BADGE_EVENT_SHORT_BUTTON_PRESS);
       }
   }
 }
}
INPUT_CALLBACK_DEFINE(NULL, input_cb, NULL);


/* Shell command for LED  */
static int cmd_led(const struct shell *shell, size_t argc, char **argv)
{
 if (argc != 2) {
   shell_print(shell, "Usage: led <r|g|b>");
   return -EINVAL;
 }
 const char *c = argv[1];
 if (strcmp(c, "r") == 0) {
   set_led_color(RGB(0x0F, 0x00, 0x00));
   shell_print(shell, "LED -> RED");
 } else if (strcmp(c, "g") == 0) {
   set_led_color(RGB(0x00, 0x0F, 0x00));
   shell_print(shell, "LED -> GREEN");
 } else if (strcmp(c, "b") == 0) {
   set_led_color(RGB(0x00, 0x00, 0x0F));
   shell_print(shell, "LED -> BLUE");
 } else {
   shell_error(shell, "Invalid color (r/g/b)");
   return -EINVAL;
 }
 return 0;
}
SHELL_CMD_REGISTER(led, NULL, "Set LED color (r, g, b)", cmd_led);


/*  Main function */
void main(void)
{
 if (!device_is_ready(strip)) {
   LOG_ERR("LED strip device not ready");
 } else {
   LOG_INF("LED strip ready, you may use shell: led r/g/b");
   set_led_color(RGB(0x0F, 0x0F, 0x0F));  // Default white
 }
 smf_set_initial(SMF_CTX(&s_obj), &badge_states[BADGE_STATE_INIT]);


 while (1) {
   enum badge_event ev;
   if (k_msgq_get(&event_msgq, &ev, K_NO_WAIT) == 0) {
     s_obj.event = ev;
     int ret = smf_run_state(SMF_CTX(&s_obj));
     if (ret != 0) {
       LOG_ERR("SMF run error: %d", ret);
     }
   }
   k_msleep(10);
 }
}



