#include <stdio.h> // Provides snprintf for formatting labels in the dashboard.
#include <string.h> // Provides strncpy/strcmp helpers for log line handling.
#include <math.h> // Provides fmodf and clamp-friendly helpers for animation math.
#include "../include/gui.h" // Provides colors, screen size, and DashboardState definition.
#include "../include/process.h" // Provides the global process table for the process panel.
#include "../include/scheduler.h" // Provides scheduling metrics types used in the scheduler panel.
#include "../include/memory.h" // Provides the global memory map for the memory panel.
#include "../include/deadlock.h" // Provides resource matrices and is_safe_state for deadlock status.
#include "../include/logger.h" // Provides LOG_FILE and clear_log for the log panel controls.

#define GUI_LOG_FILE LOG_FILE // Reuses the logger filename so the GUI reads the same audit log.

static Font dashboard_font = {0}; // Stores the dashboard font for all text rendering.
static DashboardState dashboard_state = {0}; // Stores live GUI state and animation timing.

static const Color process_palette[] = { // Defines a small palette for Gantt chart slices.
    {46, 139, 221, 255}, // Provides a blue tone for the first process slice.
    {46, 201, 160, 255}, // Provides a teal tone for the second process slice.
    {227, 179, 65, 255}, // Provides a yellow tone for the third process slice.
    {218, 54, 51, 255}, // Provides a red tone for the fourth process slice.
    {121, 192, 255, 255}, // Provides a light blue tone for the fifth process slice.
    {154, 103, 255, 255} // Provides a violet tone for the sixth process slice.
}; // Ends the process palette definition.

static void load_recent_logs(DashboardState *state) { // Loads the most recent log entries into the GUI buffer.
    FILE *log_fp = NULL; // Holds the log file pointer for reading.
    char recent_lines[20][256] = {{0}}; // Buffers the latest 20 log lines in a circular array.
    char line_buffer[256] = {0}; // Stores one log line at a time while scanning.
    int line_count = 0; // Tracks total lines read so the newest 20 can be selected.
    int index = 0; // Tracks copy index while transferring lines to the GUI state.
    int start_index = 0; // Marks the start of the latest 20 lines within the circular buffer.
    if (state == NULL) { // Guards against null state pointers.
        return; // Exits early because there is no dashboard state to update.
    } // Ends the null-state guard.
    log_fp = fopen(GUI_LOG_FILE, "r"); // Opens the shared log file for reading recent entries.
    if (log_fp == NULL) { // Handles missing or unreadable log files safely.
        state->log_count = 1; // Ensures one fallback line is displayed.
        snprintf(state->log_buffer[0], sizeof(state->log_buffer[0]), "Log file unavailable: %s", GUI_LOG_FILE); // Reports why logs are missing.
        return; // Exits because there are no file lines to copy.
    } // Ends the file-open guard.
    while (fgets(line_buffer, sizeof(line_buffer), log_fp) != NULL) { // Scans the log file one line at a time.
        snprintf(recent_lines[line_count % 20], sizeof(recent_lines[0]), "%s", line_buffer); // Copies the current line into the circular buffer.
        line_count++; // Increments the total line count as scanning continues.
    } // Ends the file-scan loop at EOF.
    fclose(log_fp); // Closes the log file after reading.
    state->log_count = 0; // Resets the visible log count before repopulating.
    start_index = line_count > 20 ? line_count - 20 : 0; // Computes where the last 20 lines begin.
    for (index = 0; index < 20 && index < line_count; index++) { // Copies at most 20 recent lines into the GUI buffer.
        int source_index = (start_index + index) % 20; // Resolves the circular buffer slot to copy.
        snprintf(state->log_buffer[index], sizeof(state->log_buffer[index]), "%s", recent_lines[source_index]); // Transfers the line into dashboard storage.
        state->log_count++; // Increments the visible log count.
    } // Ends the copy loop once the latest lines are transferred.
    if (state->log_count == 0) { // Handles empty log files gracefully.
        snprintf(state->log_buffer[0], sizeof(state->log_buffer[0]), "Log file is currently empty."); // Provides an empty-log placeholder.
        state->log_count = 1; // Ensures the panel renders at least one line.
    } // Ends the empty-log fallback branch.
} // Ends the log-loading helper.

static void draw_text_line(Font font, const char *text, Vector2 position, float size, Color color) { // Draws a line of dashboard text.
    if (text == NULL) { // Guards against null string pointers.
        return; // Exits early because there is no text to draw.
    } // Ends the null-text guard.
    DrawTextEx(font, text, position, size, 1.0f, color); // Renders the text using the configured font.
} // Ends the text-drawing helper.

static const char *process_state_label(ProcessState state) { // Maps process states to short display labels.
    switch (state) { // Chooses label based on the enum value.
        case NEW: // Handles newly created processes.
            return "NEW"; // Returns NEW label.
        case READY: // Handles ready-to-run processes.
            return "READY"; // Returns READY label.
        case RUNNING: // Handles actively running processes.
            return "RUN"; // Returns RUN label.
        case WAITING: // Handles blocked/waiting processes.
            return "WAIT"; // Returns WAIT label.
        case TERMINATED: // Handles finished processes.
            return "TERM"; // Returns TERM label.
        default: // Handles unexpected enum values.
            return "UNK"; // Returns an unknown label.
    } // Ends the state-label switch.
} // Ends the process state label helper.

static const char *process_type_label(EmergencyType type) { // Maps emergency types to short display labels.
    switch (type) { // Chooses label based on the enum value.
        case AMBULANCE: // Handles ambulance tasks.
            return "AMB"; // Returns AMB label.
        case FIRE: // Handles fire response tasks.
            return "FIRE"; // Returns FIRE label.
        case POLICE: // Handles police tasks.
            return "POL"; // Returns POL label.
        default: // Handles unexpected enum values.
            return "UNK"; // Returns unknown label.
    } // Ends the type-label switch.
} // Ends the process type label helper.

static Color process_state_color(ProcessState state) { // Maps process states to theme colors.
    switch (state) { // Chooses color based on the state.
        case RUNNING: // Highlights running processes in green.
            return SERC_GREEN; // Returns the running-state color.
        case WAITING: // Highlights waiting processes in yellow.
            return SERC_YELLOW; // Returns the waiting-state color.
        case TERMINATED: // Highlights terminated processes in red.
            return SERC_RED; // Returns the terminated-state color.
        case READY: // Highlights ready processes in blue.
            return SERC_BLUE; // Returns the ready-state color.
        case NEW: // Uses neutral text color for new processes.
        default: // Handles unexpected states by using neutral text color.
            return SERC_TEXT; // Returns the default text color.
    } // Ends the state-color switch.
} // Ends the process state color helper.

static Color log_level_color(const char *line) { // Chooses a color based on log severity in the line.
    if (line == NULL) { // Guards against null log strings.
        return SERC_TEXT; // Returns default text color for null lines.
    } // Ends the null-line guard.
    if (strstr(line, "[CRITICAL]") != NULL) { // Checks for CRITICAL severity tokens.
        return SERC_RED; // Returns red for critical alerts.
    } // Ends the critical detection branch.
    if (strstr(line, "[WARNING]") != NULL) { // Checks for WARNING severity tokens.
        return SERC_YELLOW; // Returns yellow for warnings.
    } // Ends the warning detection branch.
    return SERC_TEXT; // Defaults to standard text color for INFO or unknown levels.
} // Ends the log-level color helper.

static void format_clock_time(char *buffer, size_t buffer_size) { // Formats GetTime() into HH:MM:SS.
    int total_seconds = (int)GetTime(); // Converts Raylib's running time to integer seconds.
    int hours = (total_seconds / 3600) % 24; // Computes hours using 24-hour clock wrap.
    int minutes = (total_seconds / 60) % 60; // Computes minutes within the current hour.
    int seconds = total_seconds % 60; // Computes seconds within the current minute.
    if (buffer == NULL || buffer_size == 0U) { // Guards against invalid output buffers.
        return; // Exits early because formatting cannot proceed.
    } // Ends buffer validation guard.
    snprintf(buffer, buffer_size, "%02d:%02d:%02d", hours, minutes, seconds); // Writes formatted time into the buffer.
} // Ends the clock formatting helper.

static void draw_panel_base(Rectangle bounds, int rounded) { // Draws the panel background in a consistent style.
    if (rounded != 0) { // Draws rounded panels when requested.
        DrawRectangleRounded(bounds, 0.08f, 8, SERC_PANEL); // Draws a rounded background fill with panel color.
    } else { // Draws normal panels when rounded corners are not required.
        DrawRectangleRec(bounds, SERC_PANEL); // Draws a rectangular background fill with panel color.
    } // Ends the rounded/rectangular background branch.
    DrawRectangleLinesEx(bounds, 2.0f, SERC_BLUE); // Draws a thin border to separate the panel from the background.
} // Ends the panel background helper.

void init_gui(void) { // Initializes Raylib resources for the GUI dashboard.
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "SERC Mini-OS Dashboard"); // Opens the GUI window with the required title.
    SetTargetFPS(60); // Sets a consistent frame rate for smooth animation.
    dashboard_font = LoadFontEx("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 18, NULL, 0); // Loads a monospace dashboard font.
    if (dashboard_font.texture.id == 0) { // Checks whether the preferred font failed to load.
        dashboard_font = LoadFontEx("/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf", 18, NULL, 0); // Falls back to another monospace font.
    } // Ends the font fallback branch.
    if (dashboard_font.texture.id == 0) { // Checks whether both external fonts failed to load.
        dashboard_font = GetFontDefault(); // Falls back to Raylib's default font.
    } // Ends the default-font fallback branch.
    dashboard_state.selected_algorithm = 0; // Sets the default scheduler selection to FCFS.
    dashboard_state.selected_memory_fit = 0; // Sets the default memory-fit selection to First Fit.
    dashboard_state.quantum = 3; // Sets the Round Robin quantum default to 3.
    dashboard_state.active_panel = 0; // Clears panel focus at startup.
    dashboard_state.log_count = 0; // Clears the log buffer count before loading data.
    dashboard_state.animation_timer = 0.0f; // Resets animation timer for clean start.
    load_recent_logs(&dashboard_state); // Loads the latest log lines into the dashboard buffer.
} // Ends GUI initialization.

void close_gui(void) { // Releases GUI resources before shutting down.
    if (dashboard_font.texture.id != 0 && dashboard_font.texture.id != GetFontDefault().texture.id) { // Ensures only external fonts are unloaded.
        UnloadFont(dashboard_font); // Frees the dashboard font texture.
    } // Ends the font-unload guard.
    CloseWindow(); // Closes the Raylib window and releases graphics resources.
} // Ends GUI shutdown routine.

void draw_header(DashboardState *state) { // Draws the top header bar with title and time.
    Rectangle header_bounds = {0.0f, 0.0f, (float)SCREEN_WIDTH, 60.0f}; // Defines the header bar bounds.
    float dot_radius = 6.0f; // Sets the radius for the blinking status dot.
    float dot_x = 220.0f; // Positions the status dot near the title text.
    float dot_y = 30.0f; // Centers the status dot vertically within the header bar.
    int blink_on = 0; // Tracks whether the blinking dot should be visible.
    char time_buffer[16] = {0}; // Stores formatted HH:MM:SS time text.
    if (state == NULL) { // Guards against null state pointers.
        return; // Exits early because header depends on GUI state.
    } // Ends null-state guard.
    DrawRectangleRec(header_bounds, SERC_BLUE); // Draws the blue header background.
    draw_text_line(dashboard_font, "SERC Mini-OS", (Vector2){20.0f, 16.0f}, 28.0f, RAYWHITE); // Draws the dashboard title text.
    blink_on = ((int)floorf(state->animation_timer)) % 2 == 0; // Toggles the blink every second.
    if (blink_on != 0) { // Draws the blinking dot only on active frames.
        DrawCircleV((Vector2){dot_x, dot_y}, dot_radius, SERC_RED); // Draws the red status dot beside the title.
    } // Ends the blinking-dot branch.
    format_clock_time(time_buffer, sizeof(time_buffer)); // Formats GetTime into HH:MM:SS.
    DrawTextEx(dashboard_font, time_buffer, (Vector2){SCREEN_WIDTH - 140.0f, 18.0f}, 24.0f, 1.0f, RAYWHITE); // Draws the current time on the right.
} // Ends header rendering.

void draw_process_panel(DashboardState *state) { // Draws the left-top process table panel.
    Rectangle panel_bounds = {20.0f, 60.0f, 420.0f, 300.0f}; // Defines the process panel bounds.
    float header_y = panel_bounds.y + 12.0f; // Computes title y-position inside the panel.
    float table_y = panel_bounds.y + 52.0f; // Computes table start y-position below the title.
    float row_height = 22.0f; // Sets the height of each table row.
    float col_pid = panel_bounds.x + 12.0f; // Sets PID column x-position.
    float col_name = panel_bounds.x + 60.0f; // Sets NAME column x-position.
    float col_type = panel_bounds.x + 210.0f; // Sets TYPE column x-position.
    float col_priority = panel_bounds.x + 280.0f; // Sets PRIORITY column x-position.
    float col_state = panel_bounds.x + 335.0f; // Sets STATE column x-position.
    float col_burst = panel_bounds.x + 382.0f; // Sets BURST column x-position.
    int row_index = 0; // Tracks which visible table row is being drawn.
    int process_index = 0; // Tracks which process table slot is being scanned.
    if (state == NULL) { // Guards against null state pointers.
        return; // Exits early because panel depends on GUI state.
    } // Ends null-state guard.
    draw_panel_base(panel_bounds, 1); // Draws the rounded process panel background.
    draw_text_line(dashboard_font, "ACTIVE PROCESSES", (Vector2){panel_bounds.x + 12.0f, header_y}, 18.0f, SERC_BLUE); // Draws the panel title.
    DrawTextEx(dashboard_font, "PID", (Vector2){col_pid, table_y}, 12.0f, 1.0f, SERC_TEXT); // Draws the PID column header.
    DrawTextEx(dashboard_font, "NAME", (Vector2){col_name, table_y}, 12.0f, 1.0f, SERC_TEXT); // Draws the NAME column header.
    DrawTextEx(dashboard_font, "TYPE", (Vector2){col_type, table_y}, 12.0f, 1.0f, SERC_TEXT); // Draws the TYPE column header.
    DrawTextEx(dashboard_font, "PRIORITY", (Vector2){col_priority - 8.0f, table_y}, 12.0f, 1.0f, SERC_TEXT); // Draws the PRIORITY column header.
    DrawTextEx(dashboard_font, "STATE", (Vector2){col_state - 6.0f, table_y}, 12.0f, 1.0f, SERC_TEXT); // Draws the STATE column header.
    DrawTextEx(dashboard_font, "BURST", (Vector2){col_burst - 4.0f, table_y}, 12.0f, 1.0f, SERC_TEXT); // Draws the BURST column header.
    for (process_index = 0; process_index < MAX_PROCESSES && row_index < 10; process_index++) { // Iterates the process table for visible rows.
        PCB *pcb = &process_table[process_index]; // Caches the current process entry for readability.
        Color row_color = SERC_TEXT; // Initializes row color to default text color.
        char name_buffer[20] = {0}; // Stores a truncated process name for the table.
        char pid_buffer[8] = {0}; // Stores formatted PID text.
        char pr_buffer[8] = {0}; // Stores formatted priority text.
        char bt_buffer[8] = {0}; // Stores formatted burst time text.
        float row_y = 0.0f; // Stores the y-position for the current row.
        if (pcb->pid <= 0) { // Skips empty process slots.
            continue; // Continues to the next slot without drawing a row.
        } // Ends the empty-slot guard.
        row_y = table_y + 20.0f + (row_height * (float)row_index); // Computes y-position for this row.
        row_color = process_state_color(pcb->state); // Picks row color based on the process state.
        snprintf(name_buffer, sizeof(name_buffer), "%-18.18s", pcb->name); // Truncates and formats the process name.
        snprintf(pid_buffer, sizeof(pid_buffer), "%d", pcb->pid); // Formats the PID value.
        snprintf(pr_buffer, sizeof(pr_buffer), "%d", pcb->priority); // Formats the priority value.
        snprintf(bt_buffer, sizeof(bt_buffer), "%d", pcb->burst_time); // Formats the burst-time value.
        DrawTextEx(dashboard_font, pid_buffer, (Vector2){col_pid, row_y}, 14.0f, 1.0f, row_color); // Draws PID cell for the row.
        DrawTextEx(dashboard_font, name_buffer, (Vector2){col_name, row_y}, 14.0f, 1.0f, row_color); // Draws NAME cell for the row.
        DrawTextEx(dashboard_font, process_type_label(pcb->type), (Vector2){col_type, row_y}, 14.0f, 1.0f, row_color); // Draws TYPE cell for the row.
        DrawRectangleRec((Rectangle){col_priority - 12.0f, row_y + 4.0f, 8.0f, 8.0f}, row_color); // Draws a small priority bar beside the number.
        DrawTextEx(dashboard_font, pr_buffer, (Vector2){col_priority, row_y}, 14.0f, 1.0f, row_color); // Draws PRIORITY cell for the row.
        DrawTextEx(dashboard_font, process_state_label(pcb->state), (Vector2){col_state, row_y}, 14.0f, 1.0f, row_color); // Draws STATE cell for the row.
        DrawTextEx(dashboard_font, bt_buffer, (Vector2){col_burst, row_y}, 14.0f, 1.0f, row_color); // Draws BURST cell for the row.
        row_index++; // Advances to the next visible row.
    } // Ends the process table drawing loop.
} // Ends the process panel renderer.

void draw_memory_panel(DashboardState *state) { // Draws the left-bottom memory map panel.
    Rectangle panel_bounds = {20.0f, 360.0f, 420.0f, 300.0f}; // Defines the memory panel bounds.
    float header_y = panel_bounds.y + 12.0f; // Computes title y-position inside the panel.
    Rectangle bar_bounds = {panel_bounds.x + 20.0f, panel_bounds.y + 60.0f, panel_bounds.width - 40.0f, 36.0f}; // Defines the memory bar area.
    float cursor_x = bar_bounds.x; // Tracks x-position while drawing memory segments.
    int index = 0; // Tracks memory-map indices while iterating.
    int used_total = 0; // Accumulates total used memory in MB.
    int free_total = 0; // Accumulates total free memory in MB.
    int fragmentation = 0; // Stores fragmentation metric from the allocator.
    static int memory_initialized = 0; // Tracks whether memory flash tracking has been initialized.
    static int last_block_free[MAX_BLOCKS] = {0}; // Tracks previous free/used state per memory block.
    static float block_flash_start[MAX_BLOCKS] = {0.0f}; // Stores when each block was most recently allocated.
    if (state == NULL) { // Guards against null state pointers.
        return; // Exits early because panel depends on GUI state.
    } // Ends null-state guard.
    if (memory_initialized == 0) { // Initializes memory flash tracking on first call.
        for (index = 0; index < MAX_BLOCKS; index++) { // Iterates all memory blocks for initial state capture.
            last_block_free[index] = memory_map[index].is_free; // Captures initial free/used state for each block.
            block_flash_start[index] = -1000.0f; // Seeds flash timers far in the past so no flash appears.
        } // Ends initial memory tracking setup loop.
        memory_initialized = 1; // Marks initialization complete so it does not repeat.
    } // Ends memory initialization guard.
    draw_panel_base(panel_bounds, 1); // Draws the rounded memory panel background.
    draw_text_line(dashboard_font, "MEMORY MAP - 512MB", (Vector2){panel_bounds.x + 12.0f, header_y}, 18.0f, SERC_BLUE); // Draws the panel title.
    DrawRectangleRec(bar_bounds, SERC_DARK); // Draws the base memory bar background.
    for (index = 0; index < MAX_BLOCKS; index++) { // Iterates through memory blocks for segment drawing.
        MemoryBlock *block = &memory_map[index]; // Caches the current memory block pointer.
        float segment_width = 0.0f; // Stores the calculated width for this block segment.
        Rectangle segment_bounds = {0}; // Stores the segment rectangle for drawing.
        float flash_age = 0.0f; // Stores time since allocation for flash effect.
        if (block->size <= 0) { // Skips unused block descriptors.
            continue; // Continues to the next block.
        } // Ends the unused-block guard.
        segment_width = (bar_bounds.width * (float)block->size) / (float)TOTAL_MEMORY; // Calculates segment width proportional to block size.
        segment_bounds = (Rectangle){cursor_x, bar_bounds.y, segment_width, bar_bounds.height}; // Creates the rectangle for this memory segment.
        if (last_block_free[index] == 1 && block->is_free == 0) { // Detects a transition from free to allocated.
            block_flash_start[index] = state->animation_timer; // Captures the animation time for the flash start.
        } // Ends allocation transition detection.
        last_block_free[index] = block->is_free; // Updates the cached free/used state for this block.
        if (block->is_free == 0) { // Handles allocated block rendering.
            DrawRectangleRec(segment_bounds, SERC_BLUE); // Draws allocated blocks in SERC blue.
            DrawTextEx(dashboard_font, TextFormat("%d", block->allocated_to_pid), (Vector2){segment_bounds.x + 6.0f, segment_bounds.y + 8.0f}, 14.0f, 1.0f, RAYWHITE); // Draws the owning PID within the block.
        } else { // Handles free block rendering.
            DrawRectangleRec(segment_bounds, SERC_DARK); // Draws free blocks in dark theme color.
            for (float dot_x = segment_bounds.x; dot_x < segment_bounds.x + segment_bounds.width; dot_x += 6.0f) { // Draws dotted top border for free blocks.
                DrawRectangleRec((Rectangle){dot_x, segment_bounds.y, 2.0f, 2.0f}, SERC_TEXT); // Draws one dot on the top border.
                DrawRectangleRec((Rectangle){dot_x, segment_bounds.y + segment_bounds.height - 2.0f, 2.0f, 2.0f}, SERC_TEXT); // Draws one dot on the bottom border.
            } // Ends dotted border loop for free blocks.
        } // Ends allocated/free rendering branch.
        flash_age = state->animation_timer - block_flash_start[index]; // Computes how long since this block was allocated.
        if (block->is_free == 0 && flash_age >= 0.0f && flash_age < 0.5f) { // Checks whether the flash window is still active.
            DrawRectangleRec(segment_bounds, (Color){SERC_YELLOW.r, SERC_YELLOW.g, SERC_YELLOW.b, 120}); // Draws a brief flash overlay for new allocations.
        } // Ends the allocation flash branch.
        cursor_x += segment_width; // Advances the cursor to the next segment position.
        if (block->is_free == 0) { // Tracks used memory totals for metrics.
            used_total += block->size; // Accumulates used memory.
        } else { // Tracks free memory totals for metrics.
            free_total += block->size; // Accumulates free memory.
        } // Ends used/free accumulation branch.
    } // Ends memory block drawing loop.
    fragmentation = calculate_fragmentation(); // Calculates fragmentation in MB for the memory metrics.
    DrawTextEx(dashboard_font, TextFormat("Total Used: %dMB", used_total), (Vector2){panel_bounds.x + 20.0f, panel_bounds.y + 120.0f}, 14.0f, 1.0f, SERC_TEXT); // Draws total used memory label.
    DrawTextEx(dashboard_font, TextFormat("Total Free: %dMB", free_total), (Vector2){panel_bounds.x + 20.0f, panel_bounds.y + 140.0f}, 14.0f, 1.0f, SERC_TEXT); // Draws total free memory label.
    DrawTextEx(dashboard_font, TextFormat("Fragmentation: %.1f%%", TOTAL_MEMORY > 0 ? (100.0f * (float)fragmentation / (float)TOTAL_MEMORY) : 0.0f), (Vector2){panel_bounds.x + 20.0f, panel_bounds.y + 160.0f}, 14.0f, 1.0f, SERC_TEXT); // Draws fragmentation percentage label.
} // Ends the memory panel renderer.

void draw_scheduler_panel(DashboardState *state) { // Draws the center-top scheduler panel.
    Rectangle panel_bounds = {440.0f, 60.0f, 400.0f, 360.0f}; // Defines the scheduler panel bounds.
    float header_y = panel_bounds.y + 12.0f; // Computes title y-position inside the panel.
    Rectangle button_row = {panel_bounds.x + 10.0f, panel_bounds.y + 48.0f, panel_bounds.width - 20.0f, 36.0f}; // Defines the row area for algorithm buttons.
    float button_width = 90.0f; // Sets the width of each scheduler button.
    float button_height = 32.0f; // Sets the height of each scheduler button.
    float button_gap = 8.0f; // Sets the gap between scheduler buttons.
    Rectangle buttons[4] = {0}; // Stores rectangles for each algorithm button.
    const char *labels[4] = {"FCFS", "SJF", "PRIORITY", "ROUND"}; // Defines button labels for algorithms.
    Vector2 mouse = GetMousePosition(); // Captures mouse position for click detection.
    int i = 0; // Tracks button index during drawing.
    float gantt_y = panel_bounds.y + 110.0f; // Sets the top y-position of the Gantt chart area.
    Rectangle gantt_bounds = {panel_bounds.x + 10.0f, gantt_y, panel_bounds.width - 20.0f, 90.0f}; // Defines the Gantt chart drawing area.
    float metrics_y = gantt_bounds.y + gantt_bounds.height + 12.0f; // Sets the start of the metrics badge row.
    int active_count = 0; // Counts active processes for metric calculations.
    float avg_wait = 0.0f; // Accumulates average waiting time.
    float avg_turn = 0.0f; // Accumulates average turnaround time.
    float cpu_util = 0.0f; // Stores a simple CPU utilization estimate.
    if (state == NULL) { // Guards against null state pointers.
        return; // Exits early because panel depends on GUI state.
    } // Ends null-state guard.
    draw_panel_base(panel_bounds, 0); // Draws the scheduler panel background.
    draw_text_line(dashboard_font, "CPU SCHEDULER", (Vector2){panel_bounds.x + 12.0f, header_y}, 18.0f, SERC_BLUE); // Draws the scheduler panel title.
    for (i = 0; i < 4; i++) { // Computes button rectangles for each algorithm.
        buttons[i] = (Rectangle){button_row.x + (button_width + button_gap) * (float)i, button_row.y, button_width, button_height}; // Places each algorithm button.
    } // Ends button rectangle setup loop.
    for (i = 0; i < 4; i++) { // Draws each scheduler button.
        Color fill_color = SERC_PANEL; // Uses panel color as button fill by default.
        Color border_color = (i == state->selected_algorithm) ? SERC_BLUE : SERC_TEXT; // Highlights the selected algorithm.
        DrawRectangleRec(buttons[i], fill_color); // Draws the button background.
        DrawRectangleLinesEx(buttons[i], 2.0f, border_color); // Draws the button border.
        if (i == state->selected_algorithm) { // Adds glow to the selected algorithm button.
            DrawRectangleLinesEx((Rectangle){buttons[i].x - 2.0f, buttons[i].y - 2.0f, buttons[i].width + 4.0f, buttons[i].height + 4.0f}, 2.0f, (Color){SERC_BLUE.r, SERC_BLUE.g, SERC_BLUE.b, 120}); // Draws an outer glow border.
        } // Ends selected button glow branch.
        DrawTextEx(dashboard_font, labels[i], (Vector2){buttons[i].x + 8.0f, buttons[i].y + 7.0f}, 14.0f, 1.0f, SERC_TEXT); // Draws the button label.
        if (CheckCollisionPointRec(mouse, buttons[i]) && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) { // Detects button click using collision check.
            state->selected_algorithm = i; // Updates the selected algorithm when clicked.
        } // Ends button click handling.
    } // Ends scheduler button drawing loop.
    if (state->selected_algorithm == 3) { // Shows quantum controls for Round Robin.
        Rectangle minus_button = {panel_bounds.x + 10.0f, button_row.y + 40.0f, 24.0f, 24.0f}; // Defines the minus button.
        Rectangle plus_button = {panel_bounds.x + 160.0f, button_row.y + 40.0f, 24.0f, 24.0f}; // Defines the plus button.
        DrawRectangleRec(minus_button, SERC_PANEL); // Draws the minus button background.
        DrawRectangleLinesEx(minus_button, 2.0f, SERC_BLUE); // Draws the minus button border.
        DrawTextEx(dashboard_font, "-", (Vector2){minus_button.x + 8.0f, minus_button.y + 3.0f}, 20.0f, 1.0f, SERC_TEXT); // Draws the minus label.
        DrawRectangleRec(plus_button, SERC_PANEL); // Draws the plus button background.
        DrawRectangleLinesEx(plus_button, 2.0f, SERC_BLUE); // Draws the plus button border.
        DrawTextEx(dashboard_font, "+", (Vector2){plus_button.x + 6.0f, plus_button.y + 3.0f}, 20.0f, 1.0f, SERC_TEXT); // Draws the plus label.
        DrawTextEx(dashboard_font, TextFormat("Quantum: %d", state->quantum), (Vector2){panel_bounds.x + 50.0f, button_row.y + 44.0f}, 16.0f, 1.0f, SERC_TEXT); // Draws the current quantum label.
        if (CheckCollisionPointRec(mouse, minus_button) && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) { // Detects minus button click using collision check.
            if (state->quantum > 1) { // Ensures the quantum does not drop below 1.
                state->quantum -= 1; // Decrements the quantum value.
            } // Ends quantum lower-bound guard.
        } // Ends minus click handling.
        if (CheckCollisionPointRec(mouse, plus_button) && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) { // Detects plus button click using collision check.
            state->quantum += 1; // Increments the quantum value.
        } // Ends plus click handling.
    } // Ends Round Robin control branch.
    DrawRectangleRec(gantt_bounds, SERC_DARK); // Draws the Gantt chart background.
    { // Starts a scoped block for Gantt chart rendering and animation.
        float total_burst = 0.0f; // Accumulates total burst time for width normalization.
        int active_indices[MAX_PROCESSES] = {0}; // Stores indices of active processes for charting.
        int active_total = 0; // Tracks how many processes are included in the chart.
        float progress = fmodf(state->animation_timer, 5.0f) / 5.0f; // Computes a 0-1 progress value for chart animation.
        float visible_width = gantt_bounds.width * progress; // Determines how much of the chart is currently visible.
        float cursor = gantt_bounds.x; // Tracks x-position while drawing slices.
        int idx = 0; // Tracks active process index in the chart.
        for (i = 0; i < MAX_PROCESSES; i++) { // Scans process table to collect active processes.
            if (process_table[i].pid > 0 && process_table[i].state != TERMINATED) { // Filters active processes for charting.
                active_indices[active_total] = i; // Stores the active process index.
                active_total++; // Increments active process count.
                total_burst += (float)process_table[i].burst_time; // Accumulates burst time for width scaling.
            } // Ends active-process filter branch.
        } // Ends process scan loop.
        if (total_burst < 1.0f) { // Guards against divide-by-zero when no bursts are available.
            total_burst = 1.0f; // Sets a safe non-zero total for width calculations.
        } // Ends total-burst guard.
        for (idx = 0; idx < active_total; idx++) { // Draws each active process slice.
            PCB *pcb = &process_table[active_indices[idx]]; // Fetches the PCB for this slice.
            float slice_width = gantt_bounds.width * ((float)pcb->burst_time / total_burst); // Computes width for this slice.
            Color slice_color = process_palette[idx % (int)(sizeof(process_palette) / sizeof(process_palette[0]))]; // Selects a color for this slice.
            float draw_width = slice_width; // Initializes the width to be drawn for the slice.
            if (cursor + draw_width > gantt_bounds.x + visible_width) { // Clips slice width to animation progress.
                draw_width = (gantt_bounds.x + visible_width) - cursor; // Calculates the visible portion of the slice.
            } // Ends animation clipping branch.
            if (draw_width > 0.0f) { // Draws only if a portion of the slice is visible.
                DrawRectangleRec((Rectangle){cursor, gantt_bounds.y, draw_width, gantt_bounds.height}, slice_color); // Draws the visible slice portion.
                DrawTextEx(dashboard_font, TextFormat("P%d", pcb->pid), (Vector2){cursor + 6.0f, gantt_bounds.y + 30.0f}, 14.0f, 1.0f, RAYWHITE); // Labels the slice with PID.
            } // Ends visible-slice draw branch.
            cursor += slice_width; // Advances cursor by full slice width.
            if (cursor >= gantt_bounds.x + visible_width) { // Stops drawing when animation limit is reached.
                break; // Exits the slice loop when no more visible width remains.
            } // Ends animation limit branch.
        } // Ends Gantt slice drawing loop.
    } // Ends Gantt rendering scope.
    for (i = 0; i < MAX_PROCESSES; i++) { // Scans processes to compute simple metrics.
        if (process_table[i].pid > 0 && process_table[i].state != TERMINATED) { // Filters active processes for metrics.
            avg_wait += (float)process_table[i].waiting_time; // Accumulates waiting time.
            avg_turn += (float)process_table[i].turnaround_time; // Accumulates turnaround time.
            active_count++; // Increments active process count.
        } // Ends active process metrics filter.
    } // Ends metrics accumulation loop.
    if (active_count > 0) { // Computes averages when active processes exist.
        avg_wait /= (float)active_count; // Computes average waiting time.
        avg_turn /= (float)active_count; // Computes average turnaround time.
        cpu_util = 100.0f; // Uses full utilization when work exists.
    } else { // Handles empty system state.
        avg_wait = 0.0f; // Sets waiting time to zero when no processes are active.
        avg_turn = 0.0f; // Sets turnaround time to zero when no processes are active.
        cpu_util = 0.0f; // Sets utilization to zero when idle.
    } // Ends average computation branch.
    DrawRectangleRec((Rectangle){panel_bounds.x + 10.0f, metrics_y, 120.0f, 26.0f}, SERC_PANEL); // Draws Avg Wait badge background.
    DrawTextEx(dashboard_font, TextFormat("Avg Wait: %.1f", avg_wait), (Vector2){panel_bounds.x + 14.0f, metrics_y + 6.0f}, 12.0f, 1.0f, SERC_GREEN); // Draws Avg Wait badge text.
    DrawRectangleRec((Rectangle){panel_bounds.x + 140.0f, metrics_y, 150.0f, 26.0f}, SERC_PANEL); // Draws Avg Turnaround badge background.
    DrawTextEx(dashboard_font, TextFormat("Avg Turn: %.1f", avg_turn), (Vector2){panel_bounds.x + 144.0f, metrics_y + 6.0f}, 12.0f, 1.0f, SERC_YELLOW); // Draws Avg Turnaround badge text.
    DrawRectangleRec((Rectangle){panel_bounds.x + 300.0f, metrics_y, 90.0f, 26.0f}, SERC_PANEL); // Draws CPU Utilization badge background.
    DrawTextEx(dashboard_font, TextFormat("CPU: %.0f%%", cpu_util), (Vector2){panel_bounds.x + 304.0f, metrics_y + 6.0f}, 12.0f, 1.0f, SERC_BLUE); // Draws CPU Utilization badge text.
} // Ends the scheduler panel renderer.

void draw_resource_panel(DashboardState *state) { // Draws the center-bottom resource allocation panel.
    Rectangle panel_bounds = {440.0f, 420.0f, 400.0f, 300.0f}; // Defines the resource panel bounds.
    const char *resource_names[NUM_RESOURCES] = {"radio_channels", "ambulances", "fire_trucks", "police_cars"}; // Defines resource labels.
    float header_y = panel_bounds.y + 12.0f; // Computes title y-position inside the panel.
    float row_y = panel_bounds.y + 50.0f; // Sets initial row y-position.
    float row_height = 46.0f; // Sets height for each resource row.
    int safe = 0; // Stores the current safe/unsafe result.
    int r = 0; // Tracks resource index during rendering.
    if (state == NULL) { // Guards against null state pointers.
        return; // Exits early because panel depends on GUI state.
    } // Ends null-state guard.
    draw_panel_base(panel_bounds, 0); // Draws the resource panel background.
    draw_text_line(dashboard_font, "RESOURCE ALLOCATION", (Vector2){panel_bounds.x + 12.0f, header_y}, 18.0f, SERC_BLUE); // Draws the panel title.
    safe = is_safe_state(); // Runs Banker's safety check each frame.
    DrawRectangleRec((Rectangle){panel_bounds.x + panel_bounds.width - 130.0f, panel_bounds.y + 10.0f, 110.0f, 24.0f}, safe ? SERC_GREEN : SERC_RED); // Draws safe/unsafe badge background.
    DrawTextEx(dashboard_font, safe ? "SAFE STATE" : "UNSAFE", (Vector2){panel_bounds.x + panel_bounds.width - 124.0f, panel_bounds.y + 15.0f}, 12.0f, 1.0f, RAYWHITE); // Draws safe/unsafe badge label.
    for (r = 0; r < NUM_RESOURCES; r++) { // Draws each resource row and segmented bar.
        int total_units = 0; // Stores total units for this resource.
        int allocated_units = 0; // Stores total allocated units for this resource.
        float bar_x = panel_bounds.x + 140.0f; // Defines bar x-position.
        float bar_y = row_y + 8.0f; // Defines bar y-position.
        float bar_width = panel_bounds.width - 160.0f; // Defines bar width.
        float bar_height = 20.0f; // Defines bar height.
        int p = 0; // Tracks process index for allocation summation.
        for (p = 0; p < MAX_PROCESSES; p++) { // Sums allocations across all processes.
            allocated_units += allocation[p][r]; // Adds allocated units for this resource.
        } // Ends allocation summation loop.
        total_units = allocated_units + available[r]; // Computes total units from allocated + available.
        DrawTextEx(dashboard_font, resource_names[r], (Vector2){panel_bounds.x + 12.0f, row_y}, 14.0f, 1.0f, SERC_TEXT); // Draws resource label text.
        DrawRectangleRec((Rectangle){bar_x, bar_y, bar_width, bar_height}, SERC_DARK); // Draws bar background.
        if (total_units > 0) { // Draws segments only when total units are known.
            float unit_width = bar_width / (float)total_units; // Computes width per resource unit.
            float cursor = bar_x; // Tracks segment x-position across the bar.
            for (int u = 0; u < total_units; u++) { // Draws each unit segment.
                Color segment_color = (u < allocated_units) ? SERC_RED : SERC_GREEN; // Chooses color based on allocated/available.
                DrawRectangleRec((Rectangle){cursor, bar_y, unit_width - 1.0f, bar_height}, segment_color); // Draws one unit segment.
                cursor += unit_width; // Advances cursor for the next segment.
            } // Ends unit segment drawing loop.
        } // Ends total-units guard.
        row_y += row_height; // Advances to the next resource row.
    } // Ends resource row loop.
} // Ends the resource panel renderer.

void draw_log_panel(DashboardState *state) { // Draws the right-side log panel.
    Rectangle panel_bounds = {840.0f, 60.0f, 420.0f, 660.0f}; // Defines the log panel bounds.
    float header_y = panel_bounds.y + 12.0f; // Computes title y-position inside the panel.
    float list_y = panel_bounds.y + 50.0f; // Sets start position for log lines.
    float line_height = 24.0f; // Sets line height for log entries.
    Vector2 mouse = GetMousePosition(); // Captures mouse position for button clicks.
    Rectangle clear_button = {panel_bounds.x + 20.0f, panel_bounds.y + panel_bounds.height - 40.0f, 120.0f, 26.0f}; // Defines the Clear Log button.
    static float log_refresh_timer = 0.0f; // Accumulates time for periodic log refresh.
    static float scroll_start_time = -1000.0f; // Tracks when the last log update started.
    static char last_top_line[256] = {0}; // Stores the last known top log line.
    if (state == NULL) { // Guards against null state pointers.
        return; // Exits early because panel depends on GUI state.
    } // Ends null-state guard.
    log_refresh_timer += GetFrameTime(); // Advances the log refresh timer using frame delta.
    if (log_refresh_timer >= 1.0f) { // Refreshes logs once per second.
        load_recent_logs(state); // Loads recent log lines into the GUI buffer.
        log_refresh_timer = 0.0f; // Resets refresh timer after loading.
    } // Ends periodic refresh branch.
    draw_panel_base(panel_bounds, 0); // Draws the log panel background.
    draw_text_line(dashboard_font, "SYSTEM LOG", (Vector2){panel_bounds.x + 12.0f, header_y}, 18.0f, SERC_BLUE); // Draws the log panel title.
    if (state->log_count > 0 && strcmp(last_top_line, state->log_buffer[state->log_count - 1]) != 0) { // Detects a new top log line.
        strncpy(last_top_line, state->log_buffer[state->log_count - 1], sizeof(last_top_line) - 1); // Stores the newest top log line.
        scroll_start_time = state->animation_timer; // Captures time to start the smooth scroll.
    } // Ends new-log detection branch.
    for (int row = 0; row < state->log_count && row < 20; row++) { // Draws log entries from newest to oldest.
        int buffer_index = (state->log_count - 1) - row; // Maps row index to buffer index for newest-first order.
        float fade = 1.0f - ((float)row / 20.0f); // Computes fade factor for older log entries.
        Color base_color = log_level_color(state->log_buffer[buffer_index]); // Chooses base color by log severity.
        Color line_color = {base_color.r, base_color.g, base_color.b, (unsigned char)(255.0f * fade)}; // Applies fade alpha to line color.
        float scroll_offset = 0.0f; // Stores per-frame scroll offset for smooth updates.
        float scroll_age = state->animation_timer - scroll_start_time; // Computes time since last log update.
        if (scroll_age >= 0.0f && scroll_age < 0.25f) { // Applies scroll offset during the first 0.25s after update.
            scroll_offset = line_height * (1.0f - (scroll_age / 0.25f)); // Calculates eased scroll offset for smooth motion.
        } // Ends scroll offset computation branch.
        DrawTextEx(dashboard_font, state->log_buffer[buffer_index], (Vector2){panel_bounds.x + 16.0f, list_y + (line_height * (float)row) + scroll_offset}, 14.0f, 1.0f, line_color); // Draws the log line with fade and scroll.
    } // Ends log drawing loop.
    DrawRectangleRec(clear_button, SERC_PANEL); // Draws the Clear Log button background.
    DrawRectangleLinesEx(clear_button, 2.0f, SERC_BLUE); // Draws the Clear Log button border.
    DrawTextEx(dashboard_font, "Clear Log", (Vector2){clear_button.x + 16.0f, clear_button.y + 6.0f}, 14.0f, 1.0f, SERC_TEXT); // Draws the Clear Log button label.
    if (CheckCollisionPointRec(mouse, clear_button) && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) { // Detects Clear Log button clicks.
        clear_log(); // Clears the log file content.
        load_recent_logs(state); // Reloads log buffer after clearing.
    } // Ends Clear Log click handling.
} // Ends the log panel renderer.

void run_gui(void) { // Runs the main GUI loop until the window closes.
    init_gui(); // Initializes the GUI resources before entering the loop.
    while (!WindowShouldClose()) { // Runs the main loop until the user closes the window.
        float delta = GetFrameTime(); // Captures delta time for animation updates.
        dashboard_state.animation_timer += delta; // Advances the animation timer each frame.
        BeginDrawing(); // Begins the drawing pass for the frame.
        ClearBackground(SERC_DARK); // Clears the screen with the dashboard background color.
        draw_header(&dashboard_state); // Draws the header bar first.
        draw_process_panel(&dashboard_state); // Draws the process table panel.
        draw_memory_panel(&dashboard_state); // Draws the memory map panel.
        draw_scheduler_panel(&dashboard_state); // Draws the scheduler panel.
        draw_resource_panel(&dashboard_state); // Draws the resource and deadlock panel.
        draw_log_panel(&dashboard_state); // Draws the log panel last.
        EndDrawing(); // Ends the drawing pass so the frame presents.
    } // Ends the GUI loop once the window should close.
    close_gui(); // Cleans up GUI resources after the loop.
} // Ends the GUI run function.