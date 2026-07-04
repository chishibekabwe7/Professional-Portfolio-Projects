#ifndef GUI_H // Starts the include guard so the GUI declarations are only processed once.
#define GUI_H // Defines the include-guard token for the dashboard interface.
#include <raylib.h> // Imports Raylib drawing types and API declarations for the dashboard.
#define SCREEN_WIDTH 1280 // Sets the dashboard window width to 1280 pixels for a wide operator view.
#define SCREEN_HEIGHT 720 // Sets the dashboard window height to 720 pixels for a clean 16:9 layout.
static const Color SERC_DARK = {13, 17, 23, 255}; // Defines the dark background tone using the requested #0d1117 theme color.
static const Color SERC_BLUE = {31, 111, 235, 255}; // Defines the primary blue accent using the requested #1f6feb theme color.
static const Color SERC_GREEN = {35, 134, 54, 255}; // Defines the success green accent using the requested #238636 theme color.
static const Color SERC_RED = {218, 54, 51, 255}; // Defines the alert red accent using the requested #da3633 theme color.
static const Color SERC_YELLOW = {227, 179, 65, 255}; // Defines the warning yellow accent using the requested #e3b341 theme color.
static const Color SERC_PANEL = {22, 27, 34, 255}; // Defines the panel background color using the requested #161b22 theme color.
static const Color SERC_TEXT = {201, 209, 217, 255}; // Defines the primary text color using the requested #c9d1d9 theme color.
typedef struct DashboardState { // Declares the in-memory state used to drive the dashboard UI.
	int selected_algorithm; // Stores the selected scheduler algorithm where 0=FCFS, 1=SJF, 2=Priority, and 3=RoundRobin.
	int selected_memory_fit; // Stores the selected allocator strategy where 0=FirstFit, 1=BestFit, and 2=WorstFit.
	int quantum; // Stores the Round Robin time quantum and defaults to 3 for short scheduling slices.
	int active_panel; // Stores the currently focused panel so keyboard input can target one section at a time.
	char log_buffer[20][256]; // Stores the most recent 20 log lines for the dashboard log panel.
	int log_count; // Stores how many log lines are currently available in the buffer.
	float animation_timer; // Stores a running animation timer used for smooth panel effects.
} DashboardState; // Names the dashboard state container so GUI code can manage one shared struct.
void init_gui(void); // Declares the GUI initialization routine that creates the Raylib window and loads fonts.
void run_gui(void); // Declares the main GUI loop that keeps the dashboard responsive until the window closes.
void close_gui(void); // Declares the cleanup routine that releases GUI resources before exit.
void draw_header(DashboardState *state); // Declares the header renderer for the dashboard title and system summary.
void draw_process_panel(DashboardState *state); // Declares the process panel renderer for process table highlights.
void draw_memory_panel(DashboardState *state); // Declares the memory panel renderer for allocator status and fit mode.
void draw_scheduler_panel(DashboardState *state); // Declares the scheduler panel renderer for algorithm and quantum controls.
void draw_log_panel(DashboardState *state); // Declares the log panel renderer for recent log messages.
void draw_resource_panel(DashboardState *state); // Declares the resource panel renderer for emergency-system status blocks.
#endif // GUI_H // Ends the include guard after all dashboard declarations are defined.
