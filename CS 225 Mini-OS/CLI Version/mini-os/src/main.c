/*
 * Filename: main.c
 * Purpose: Entry point and menu flow for the mini-os Smart Emergency Response Center simulation.
 * Author: 
 * Date: 2026-04-
 */
#include <ctype.h> // Provides tolower so menu sub-options can be normalized for easier user input handling.
#include <stdio.h> // Provides printf, fgets, and sscanf for console menu rendering and input parsing.
#include <string.h> // Provides strcmp-safe style utilities if future menu parsing expands.
#include "../include/process.h" // Provides process management APIs for task creation, viewing, and termination.
#include "../include/scheduler.h" // Provides scheduling APIs and ScheduleResult type for CPU scheduling operations.
#include "../include/memory.h" // Provides memory management APIs for allocation, freeing, and map display.
#include "../include/ipc.h" // Provides IPC demonstration API for pipe and message-queue communication tests.
#include "../include/deadlock.h" // Provides Banker's Algorithm APIs for resource requests and safety checks.
#include "../include/logger.h" // Provides logging APIs so every major action is recorded in the system log.

static int read_int_value(const char *prompt, int *out_value) { // Reads an integer safely so menu/input parsing is robust.
	char input_buffer[128] = {0}; // Stores one full input line to avoid direct scanf pitfalls with buffered stdin.
	if (prompt == NULL || out_value == NULL) { // Validates pointers so function never dereferences invalid memory.
		return 0; // Returns failure because caller did not provide required input/output references.
	} // Closes pointer-validation branch before normal input flow.
	printf("%s", prompt); // Prints prompt text so user knows which numeric value to provide.
	if (fgets(input_buffer, sizeof(input_buffer), stdin) == NULL) { // Calls fgets to read one line safely within buffer bounds.
		return 0; // Returns failure because input stream did not deliver readable data.
	} // Closes fgets-failure guard branch.
	if (sscanf(input_buffer, "%d", out_value) != 1) { // Calls sscanf to parse exactly one integer from the captured line.
		return 0; // Returns failure because the entered text was not a valid integer.
	} // Closes parse-failure branch after validation.
	return 1; // Returns success because a valid integer was parsed and written to output.
} // Ends integer-input helper after success/failure status is determined.

static int read_char_value(const char *prompt, char *out_value) { // Reads one character option safely for submenu navigation.
	char input_buffer[128] = {0}; // Stores one full line so parser can safely extract first non-space option character.
	if (prompt == NULL || out_value == NULL) { // Validates pointers so function avoids null dereference issues.
		return 0; // Returns failure because prompt/output arguments are not valid.
	} // Closes pointer-validation branch.
	printf("%s", prompt); // Prints prompt text so user knows which letter option to enter.
	if (fgets(input_buffer, sizeof(input_buffer), stdin) == NULL) { // Calls fgets to read input line without overflowing buffers.
		return 0; // Returns failure because no input line was available to parse.
	} // Closes fgets-failure branch.
	if (sscanf(input_buffer, " %c", out_value) != 1) { // Calls sscanf with leading space so newline/whitespace is skipped before reading character.
		return 0; // Returns failure because a valid option character was not parsed.
	} // Closes parse-failure branch.
	*out_value = (char)tolower((unsigned char)*out_value); // Normalizes option to lowercase so uppercase input still maps to same actions.
	return 1; // Returns success because a valid normalized character option was captured.
} // Ends character-input helper after output is populated.

static void log_info(const char *message) { // Provides concise wrapper so normal operational events are logged consistently.
	log_event(LOG_INFO, (char *)message); // Calls log_event to record informational audit entry for completed action.
} // Ends info-log helper after dispatching log request.

static void log_warning(const char *message) { // Provides concise wrapper so warning situations are logged consistently.
	log_event(LOG_WARNING, (char *)message); // Calls log_event to record warning audit entry for invalid/denied actions.
} // Ends warning-log helper after dispatching log request.

static void log_critical(const char *message) { // Provides concise wrapper so critical situations are logged consistently.
	log_event(LOG_CRITICAL, (char *)message); // Calls log_event to record high-severity audit entry for dangerous conditions.
} // Ends critical-log helper after dispatching log request.

static void run_demo_scenario(void) { 
	int index = 0; // Iterates process slots so demo can reset and populate deterministic process data.
	int block_id = -1; // Stores memory allocation result for each demo process so success/failure is visible.
	ScheduleResult demo_result = {0.0f, 0.0f, 0.0f}; // Stores priority scheduling metrics produced during demo execution.
	char pipe_message_one[] = "DEMO PIPE 1: Ambulance Unit A requesting trauma bay clearance."; // Defines first pipe message to demonstrate emergency communication flow.
	char pipe_message_two[] = "DEMO PIPE 2: Fire Unit B reporting hazardous smoke escalation."; // Defines second pipe message to show multiple IPC transmissions.
	printf("\n================ LIVE DEMO SCENARIO ================\n"); // Prints demo header so audience can clearly see scripted sequence start.
	log_info("Demo scenario: started automated presentation workflow."); // Logs demo start so presentation timeline is captured in audit file.
	init_memory(); // Reinitializes memory map so demo allocation outcomes are deterministic and easy to explain live.
	log_info("Demo scenario: memory subsystem reinitialized for clean allocation baseline."); // Logs memory reset step for traceability.
	for (index = 0; index < MAX_PROCESSES; index++) { // Clears all process slots so demo process set is the only active workload.
		process_table[index].pid = 0; // Clears PID so non-demo entries are ignored by schedulers and lookups.
		process_table[index].name[0] = '\0'; // Clears process name so stale labels do not appear in future outputs.
		process_table[index].type = AMBULANCE; // Assigns safe default enum value while resetting process entries.
		process_table[index].state = TERMINATED; // Marks reset entries terminated so scheduler filters them out.
		process_table[index].priority = 1; // Sets default low priority so reset data remains benign.
		process_table[index].arrival_time = 0; // Resets arrival metadata to neutral baseline.
		process_table[index].burst_time = 0; // Resets burst metadata because cleared slots should represent no work.
		process_table[index].remaining_time = 0; // Resets RR metadata so stale runtime values are removed.
		process_table[index].waiting_time = 0; // Resets waiting metric to avoid carrying old calculations into demo.
		process_table[index].turnaround_time = 0; // Resets turnaround metric to preserve demo accuracy.
		process_table[index].memory_required = 0; // Resets memory demand so cleared entries do not request allocations.
		process_table[index].memory_start = -1; // Marks cleared entry as not allocated in memory map.
	} // Closes process-reset loop after all table slots are sanitized.
	process_table[0].pid = 1; // Creates demo process 1 with explicit PID for deterministic references.
	snprintf(process_table[0].name, sizeof(process_table[0].name), "Ambulance Dispatch Alpha"); // Assigns descriptive demo name for medical response scenario.
	process_table[0].type = AMBULANCE; // Sets emergency type to AMBULANCE to represent medical unit workload.
	process_table[0].state = NEW; // Marks process NEW so scheduler can include it in runnable set.
	process_table[0].priority = 5; // Assigns highest priority to simulate life-critical ambulance dispatch.
	process_table[0].arrival_time = 0; // Sets earliest arrival so process is immediately available in demo timeline.
	process_table[0].burst_time = 6; // Sets CPU burst to represent meaningful but bounded processing workload.
	process_table[0].remaining_time = process_table[0].burst_time; // Initializes remaining time so preemptive schedulers have correct starting value.
	process_table[0].waiting_time = 0; // Resets waiting metric before scheduling calculations.
	process_table[0].turnaround_time = 0; // Resets turnaround metric before scheduling calculations.
	process_table[0].memory_required = 48; // Sets memory need to demonstrate allocator behavior for medium-size request.
	process_table[0].memory_start = -1; // Initializes memory pointer as unallocated before first_fit call.
	process_table[1].pid = 2; // Creates demo process 2 with explicit PID for deterministic references.
	snprintf(process_table[1].name, sizeof(process_table[1].name), "Fire Suppression Bravo"); // Assigns descriptive demo name for fire response scenario.
	process_table[1].type = FIRE; // Sets emergency type to FIRE to represent fire-truck dispatch workload.
	process_table[1].state = READY; // Marks process READY to show mix of NEW and READY states in demo.
	process_table[1].priority = 4; // Assigns high priority to reflect urgent but slightly lower-than-critical incident.
	process_table[1].arrival_time = 1; // Sets staggered arrival to produce realistic scheduling order effects.
	process_table[1].burst_time = 5; // Sets CPU burst for mid-sized scheduling workload.
	process_table[1].remaining_time = process_table[1].burst_time; // Initializes remaining time to full burst before scheduling.
	process_table[1].waiting_time = 0; // Resets waiting metric prior to scheduler execution.
	process_table[1].turnaround_time = 0; // Resets turnaround metric prior to scheduler execution.
	process_table[1].memory_required = 64; // Sets memory requirement to demonstrate larger allocation request.
	process_table[1].memory_start = -1; // Initializes memory pointer as unallocated before allocator run.
	process_table[2].pid = 3; // Creates demo process 3 with explicit PID for deterministic references.
	snprintf(process_table[2].name, sizeof(process_table[2].name), "Police Traffic Gamma"); // Assigns descriptive demo name for police traffic-control scenario.
	process_table[2].type = POLICE; // Sets emergency type to POLICE to represent law-enforcement workload.
	process_table[2].state = NEW; // Marks process NEW to keep it eligible for scheduling run.
	process_table[2].priority = 3; // Assigns medium priority to reflect moderate urgency policing task.
	process_table[2].arrival_time = 2; // Staggers arrival to demonstrate scheduler handling of later tasks.
	process_table[2].burst_time = 4; // Sets shorter CPU burst to diversify workload characteristics.
	process_table[2].remaining_time = process_table[2].burst_time; // Initializes remaining time for consistency across algorithms.
	process_table[2].waiting_time = 0; // Clears waiting metric before calculations.
	process_table[2].turnaround_time = 0; // Clears turnaround metric before calculations.
	process_table[2].memory_required = 32; // Sets smaller memory requirement to show varied allocation sizes.
	process_table[2].memory_start = -1; // Marks memory as unallocated pending first_fit.
	process_table[3].pid = 4; // Creates demo process 4 with explicit PID for deterministic references.
	snprintf(process_table[3].name, sizeof(process_table[3].name), "Fire Rescue Delta"); // Assigns descriptive demo name for rescue-oriented fire operation.
	process_table[3].type = FIRE; // Sets emergency type to FIRE for second fire-related workload example.
	process_table[3].state = READY; // Marks process READY to show scheduler handling already-runnable entries.
	process_table[3].priority = 5; // Assigns critical priority to simulate severe rescue incident.
	process_table[3].arrival_time = 3; // Uses later arrival to illustrate queue progression with high-priority tasks.
	process_table[3].burst_time = 7; // Uses longer burst to demonstrate impact of heavy urgent workload.
	process_table[3].remaining_time = process_table[3].burst_time; // Initializes remaining time to full burst at demo start.
	process_table[3].waiting_time = 0; // Resets waiting metric pre-scheduling.
	process_table[3].turnaround_time = 0; // Resets turnaround metric pre-scheduling.
	process_table[3].memory_required = 80; // Uses large memory request to highlight allocator capacity consumption.
	process_table[3].memory_start = -1; // Marks no allocation before allocator execution.
	process_table[4].pid = 5; // Creates demo process 5 with explicit PID for deterministic references.
	snprintf(process_table[4].name, sizeof(process_table[4].name), "Police Patrol Echo"); // Assigns descriptive demo name for routine but important patrol support.
	process_table[4].type = POLICE; // Sets emergency type to POLICE for second law-enforcement workload example.
	process_table[4].state = NEW; // Marks process NEW to ensure scheduler eligibility.
	process_table[4].priority = 2; // Assigns lower priority to represent non-critical support operation.
	process_table[4].arrival_time = 4; // Uses latest arrival to complete a realistic staggered process set.
	process_table[4].burst_time = 3; // Uses short burst to diversify execution profile.
	process_table[4].remaining_time = process_table[4].burst_time; // Initializes remaining time for scheduling correctness.
	process_table[4].waiting_time = 0; // Clears waiting metric before algorithm run.
	process_table[4].turnaround_time = 0; // Clears turnaround metric before algorithm run.
	process_table[4].memory_required = 24; // Uses small memory request to show allocator handling varied workloads.
	process_table[4].memory_start = -1; // Marks memory as unallocated before first_fit execution.
	printf("Created 5 demo emergency processes with varied units and priorities.\n"); // Prints creation summary so audience sees scenario setup completion.
	log_info("Demo scenario: created 5 emergency processes with mixed types and priorities."); // Logs process-setup milestone for audit trail.
	for (index = 0; index < 5; index++) { // Iterates demo processes to allocate memory using first-fit strategy.
		block_id = first_fit(process_table[index].pid, process_table[index].memory_required); // Calls first_fit to allocate memory per demo process requirement.
		if (block_id >= 0) { // Checks allocation success so process metadata and logs reflect real outcome.
			process_table[index].memory_start = block_id; // Stores allocated block ID for this process so memory ownership is visible.
			printf("Allocated %dMB to PID %d at block %d.\n", process_table[index].memory_required, process_table[index].pid, block_id); // Prints success line for live demonstration clarity.
			log_info("Demo scenario: memory allocation succeeded for one process using first_fit."); // Logs successful allocation event for timeline completeness.
		} else { // Handles allocation failure when no suitable block exists.
			printf("Allocation failed for PID %d (requested %dMB).\n", process_table[index].pid, process_table[index].memory_required); // Prints failure detail so audience sees allocator constraints.
			log_warning("Demo scenario: memory allocation failed for one process using first_fit."); // Logs allocation failure for diagnostic traceability.
		} // Closes allocation success/failure branch for current process.
	} // Closes allocation loop after all five demo processes are attempted.
	log_memory_state(); // Logs memory snapshot so demo includes post-allocation map evidence in file.
	demo_result = run_priority(); // Runs priority scheduler to demonstrate urgency-based CPU dispatch behavior.
	display_schedule_metrics(demo_result); // Prints scheduling metrics so audience can interpret performance outcomes immediately.
	log_schedule_result(demo_result); // Logs scheduling metrics for persistent demonstration artifacts.
	log_info("Demo scenario: ran Priority Scheduling and captured metrics."); // Logs scheduling milestone so demo progression is auditable.
	send_via_pipe(pipe_message_one); // Sends first pipe message to showcase direct IPC communication in action.
	send_via_pipe(pipe_message_two); // Sends second pipe message to demonstrate repeated IPC interactions.
	log_info("Demo scenario: sent two IPC messages through pipe communication."); // Logs IPC stage completion for full scenario trace.
	if (is_safe_state() == 1) { // Runs Banker's safety check and evaluates whether system remains in safe state.
		printf("Banker's safety check during demo: SAFE state.\n"); // Prints safe-state result so audience sees deadlock-avoidance outcome.
		log_info("Demo scenario: Banker's algorithm safety check returned SAFE."); // Logs safe-state outcome for compliance trace.
	} else { // Handles unsafe-state result from Banker's check.
		printf("Banker's safety check during demo: UNSAFE state.\n"); // Prints unsafe-state result so audience sees risk detection behavior.
		log_critical("Demo scenario: Banker's algorithm safety check returned UNSAFE."); // Logs unsafe outcome as critical because it signals potential deadlock risk.
	} // Closes safe/unsafe outcome branch for Banker's check.
	log_info("Demo scenario: printing full system log for presentation review."); // Logs final stage before displaying full log output.
	display_log(); // Prints complete log file so audience can review all recorded demo events.
	printf("====================================================\n"); // Prints demo footer to mark scripted scenario completion.
} // Ends scripted live demo function after all required subsystem demonstrations finish.

int main(void) { // Defines program entry point that runs the interactive SERC Mini-OS console.
	int main_choice = -1; // Stores top-level menu selection so do-while loop can dispatch requested module.
	char sub_choice = '\0'; // Stores submenu letter selection for each grouped top-level module.
	int pid = 0; // Reuses PID variable for terminate, memory, and deadlock request operations.
	int size = 0; // Reuses size variable for memory allocation requests.
	int quantum = 0; // Stores Round Robin time quantum entered by user.
	int request[NUM_RESOURCES] = {0, 0, 0, 0}; // Stores Banker's request vector for resource-request operation.
	ScheduleResult schedule_result = {0.0f, 0.0f, 0.0f}; // Stores scheduling output metrics for display and logging.
	do { // Uses do-while loop as required so menu is shown repeatedly until user chooses exit.
		if (main_choice == -1) { // Runs startup initialization exactly once before the first menu interaction.
			printf("\nBootstrapping SERC Mini-OS modules...\n"); // Prints startup status so user knows initialization is in progress.
			init_memory(); // Calls init_memory at startup so allocator map begins in known free-state layout.
			init_log(); // Calls init_log at startup so session logging is available before operational actions begin.
			log_info("System startup: logger initialized."); // Logs startup milestone so boot sequence is traceable.
			log_info("System startup: memory manager initialized."); // Logs memory initialization so allocator baseline is auditable.
			init_resources(); // Calls init_resources at startup so Banker matrices are initialized for deadlock management.
			log_info("System startup: resource manager initialized."); // Logs resource initialization so safety baseline is recorded.
			main_choice = 99; // Assigns non-exit sentinel so startup branch does not rerun on subsequent iterations.
		} // Closes one-time startup branch.
		printf("\n--- SERC Mini-OS ---\n"); // Prints menu title so interface matches requested branding.
		printf("1. Process Management\n"); // Prints top-level section 1 for process operations.
		printf("   1a. Create new emergency task\n"); // Prints required 1a option label.
		printf("   1b. View process table\n"); // Prints required 1b option label.
		printf("   1c. Terminate a process\n"); // Prints required 1c option label.
		printf("2. CPU Scheduling\n"); // Prints top-level section 2 for scheduler operations.
		printf("   2a. Run FCFS\n"); // Prints required 2a option label.
		printf("   2b. Run SJF\n"); // Prints required 2b option label.
		printf("   2c. Run Priority Scheduling\n"); // Prints required 2c option label.
		printf("   2d. Run Round Robin (prompt for time quantum)\n"); // Prints required 2d option label.
		printf("3. Memory Management\n"); // Prints top-level section 3 for allocator operations.
		printf("   3a. Allocate memory (First Fit / Best Fit / Worst Fit — user chooses)\n"); // Prints required 3a option label.
		printf("   3b. Free memory for a PID\n"); // Prints required 3b option label.
		printf("   3c. View memory map\n"); // Prints required 3c option label.
		printf("4. IPC Demo\n"); // Prints top-level section 4 for IPC demonstration.
		printf("5. Deadlock Management\n"); // Prints top-level section 5 for Banker/deadlock tools.
		printf("   5a. View resource allocation table\n"); // Prints required 5a option label.
		printf("   5b. Request resources for a PID\n"); // Prints required 5b option label.
		printf("   5c. Run safety check (Banker's)\n"); // Prints required 5c option label.
		printf("   5d. Detect deadlock\n"); // Prints required 5d option label.
		printf("6. File Log\n"); // Prints top-level section 6 for log viewing and clearing.
		printf("   6a. View system log\n"); // Prints required 6a option label.
		printf("   6b. Clear log\n"); // Prints required 6b option label.
		printf("7. Run Live Demo Scenario\n"); // Prints top-level section 7 so presenters can execute full scripted walkthrough quickly.
		printf("0. Exit\n"); // Prints required exit option label.
		if (read_int_value("Select main option (0-7): ", &main_choice) == 0) { // Validates top-level numeric selection input.
			printf("Invalid main option input. Please enter a number from 0 to 7.\n"); // Explains parse error so user can correct input.
			log_warning("Invalid main menu input provided."); // Logs invalid input because menu misuse is operationally relevant.
			continue; // Restarts menu loop because no valid top-level action can be executed.
		} // Closes main-option parse branch.
		switch (main_choice) { // Dispatches to selected major subsystem based on top-level menu input.
			case 1: // Handles Process Management menu group.
				if (read_char_value("Select sub-option for Process Management (a/b/c): ", &sub_choice) == 0) { // Reads process submenu letter safely.
					printf("Invalid process sub-option input.\n"); // Explains submenu parse failure for user correction.
					log_warning("Invalid process submenu input provided."); // Logs invalid submenu usage for audit trace.
					break; // Leaves case because no valid process action can be executed.
				} // Closes process submenu input-validation branch.
				switch (sub_choice) { // Dispatches specific process management action by submenu letter.
					case 'a': // Handles creation of a new emergency task.
						create_process(); // Calls process-creation API to collect task details and append to process table.
						log_info("Process action: created new emergency task."); // Logs successful process creation action.
						break; // Ends 1a branch after action execution.
					case 'b': // Handles display of process table.
						display_process_table(); // Calls table-display API so operator can review current process states.
						log_info("Process action: viewed process table."); // Logs table-view action for usage traceability.
						break; // Ends 1b branch after action execution.
					case 'c': // Handles process termination by PID.
						if (read_int_value("Enter PID to terminate: ", &pid) == 0) { // Reads PID input and validates numeric parse.
							printf("Invalid PID input.\n"); // Explains bad PID entry so user can retry.
							log_warning("Process action: invalid PID input for terminate."); // Logs invalid terminate input attempt.
							break; // Leaves 1c branch because termination requires valid PID.
						} // Closes terminate PID-input validation branch.
						terminate_process(pid); // Calls terminate API to mark target process terminated.
						free_memory(pid); // Calls free_memory so any blocks owned by terminated process are released.
						log_info("Process action: terminate request executed."); // Logs termination workflow completion.
						log_memory_state(); // Writes memory snapshot so post-termination resource state is captured.
						break; // Ends 1c branch after terminate and cleanup actions.
					default: // Handles unsupported submenu letters.
						printf("Invalid Process Management sub-option.\n"); // Informs user that entered submenu letter is not mapped.
						log_warning("Process action: unknown submenu option selected."); // Logs unsupported submenu attempt.
						break; // Ends invalid process-submenu handling.
				} // Closes Process Management submenu switch.
				break; // Ends top-level case 1 handling.
			case 2: // Handles CPU Scheduling menu group.
				if (read_char_value("Select sub-option for CPU Scheduling (a/b/c/d): ", &sub_choice) == 0) { // Reads scheduling submenu option safely.
					printf("Invalid scheduling sub-option input.\n"); // Informs user of parse failure for scheduling submenu.
					log_warning("Scheduling action: invalid submenu input provided."); // Logs invalid scheduling submenu attempt.
					break; // Leaves case because no scheduling action can proceed.
				} // Closes scheduling submenu parse branch.
				switch (sub_choice) { // Dispatches requested scheduling algorithm.
					case 'a': // Handles FCFS scheduling run.
						schedule_result = run_fcfs(); // Calls FCFS engine to schedule NEW/READY processes and compute metrics.
						display_schedule_metrics(schedule_result); // Calls metrics display so user sees FCFS performance outcomes.
						log_schedule_result(schedule_result); // Logs schedule metrics block for later audit/analysis.
						log_info("Scheduling action: ran FCFS."); // Logs FCFS execution as major system action.
						break; // Ends 2a scheduling branch.
					case 'b': // Handles SJF scheduling run.
						schedule_result = run_sjf(); // Calls SJF engine to schedule using burst-time ordering.
						display_schedule_metrics(schedule_result); // Displays SJF metrics so operator can compare algorithm behavior.
						log_schedule_result(schedule_result); // Persists SJF metrics in log file for historical comparison.
						log_info("Scheduling action: ran SJF."); // Logs SJF execution completion.
						break; // Ends 2b scheduling branch.
					case 'c': // Handles priority scheduling run.
						schedule_result = run_priority(); // Calls priority scheduler so urgent tasks are processed first.
						display_schedule_metrics(schedule_result); // Displays priority scheduling metrics for immediate review.
						log_schedule_result(schedule_result); // Logs priority metrics for operational recordkeeping.
						log_info("Scheduling action: ran Priority Scheduling."); // Logs priority run as major scheduling action.
						break; // Ends 2c scheduling branch.
					case 'd': // Handles Round Robin scheduling run.
						if (read_int_value("Enter Round Robin time quantum (>0): ", &quantum) == 0) { // Reads quantum as integer for RR slicing.
							printf("Invalid quantum input.\n"); // Reports parse failure so user can provide valid quantum.
							log_warning("Scheduling action: invalid quantum input for Round Robin."); // Logs invalid RR input attempt.
							break; // Leaves RR branch because algorithm requires valid quantum.
						} // Closes quantum parse-validation branch.
						if (quantum <= 0) { // Validates positive quantum because non-positive slice length is invalid.
							printf("Quantum must be greater than zero.\n"); // Explains RR constraint so user can retry correctly.
							log_warning("Scheduling action: non-positive quantum rejected."); // Logs rejected RR quantum value.
							break; // Leaves RR branch because invalid quantum cannot be used.
						} // Closes quantum range-check branch.
						schedule_result = run_round_robin(quantum); // Calls RR scheduler using validated quantum value.
						display_schedule_metrics(schedule_result); // Displays RR metrics so fairness/utilization can be reviewed.
						log_schedule_result(schedule_result); // Logs RR metrics for persistent performance tracking.
						log_info("Scheduling action: ran Round Robin."); // Logs RR execution completion.
						break; // Ends 2d scheduling branch.
					default: // Handles unsupported scheduling submenu letters.
						printf("Invalid CPU Scheduling sub-option.\n"); // Informs user that submenu letter is not valid for scheduling menu.
						log_warning("Scheduling action: unknown submenu option selected."); // Logs unsupported scheduling submenu attempt.
						break; // Ends invalid scheduling-submenu handling.
				} // Closes CPU Scheduling submenu switch.
				break; // Ends top-level case 2 handling.
			case 3: // Handles Memory Management menu group.
				if (read_char_value("Select sub-option for Memory Management (a/b/c): ", &sub_choice) == 0) { // Reads memory submenu option safely.
					printf("Invalid memory sub-option input.\n"); // Reports parse failure so operator can retry menu input.
					log_warning("Memory action: invalid submenu input provided."); // Logs invalid memory submenu usage.
					break; // Leaves case because memory action cannot proceed without valid option.
				} // Closes memory submenu parse branch.
				switch (sub_choice) { // Dispatches requested memory management operation.
					case 'a': { // Handles memory allocation with user-selected fit strategy.
						int block_id = -1; // Stores allocation result block ID so success/failure can be reported.
						char fit_choice = '\0'; // Stores selected fit strategy option.
						PCB *target_process = NULL; // Stores process pointer so PCB memory metadata can be updated after allocation.
						if (read_int_value("Enter PID for allocation: ", &pid) == 0) { // Reads target PID for allocation ownership.
							printf("Invalid PID input.\n"); // Reports invalid PID parse for allocation request.
							log_warning("Memory action: invalid PID input for allocation."); // Logs invalid allocation PID entry.
							break; // Leaves allocation branch because valid PID is required.
						} // Closes PID parse branch for allocation.
						if (read_int_value("Enter memory size in MB (>0): ", &size) == 0) { // Reads requested allocation size.
							printf("Invalid size input.\n"); // Reports invalid size parse so user can retry.
							log_warning("Memory action: invalid size input for allocation."); // Logs invalid allocation size entry.
							break; // Leaves allocation branch because valid size is required.
						} // Closes size parse branch for allocation.
						if (size <= 0) { // Validates positive request size because zero/negative requests are invalid.
							printf("Size must be greater than zero.\n"); // Explains size constraint to user.
							log_warning("Memory action: non-positive allocation size rejected."); // Logs rejected allocation size value.
							break; // Leaves allocation branch on invalid size.
						} // Closes size-range branch.
						if (read_char_value("Choose fit strategy (a=First Fit, b=Best Fit, c=Worst Fit): ", &fit_choice) == 0) { // Reads allocation strategy option.
							printf("Invalid fit strategy input.\n"); // Reports fit-choice parse failure.
							log_warning("Memory action: invalid fit strategy input."); // Logs invalid strategy selection attempt.
							break; // Leaves allocation branch because strategy is required.
						} // Closes fit-choice parse branch.
						switch (fit_choice) { // Dispatches selected fit strategy implementation.
							case 'a': // Handles First Fit allocation.
								block_id = first_fit(pid, size); // Calls first_fit for fast first-available allocation scan.
								break; // Ends first-fit selection branch.
							case 'b': // Handles Best Fit allocation.
								block_id = best_fit(pid, size); // Calls best_fit to minimize immediate wasted leftover space.
								break; // Ends best-fit selection branch.
							case 'c': // Handles Worst Fit allocation.
								block_id = worst_fit(pid, size); // Calls worst_fit to allocate from largest available block.
								break; // Ends worst-fit selection branch.
							default: // Handles invalid fit strategy letter.
								printf("Invalid fit strategy option.\n"); // Informs user that only a/b/c are valid strategy keys.
								log_warning("Memory action: unknown fit strategy option selected."); // Logs unsupported fit strategy attempt.
								block_id = -1; // Forces failure status so post-allocation success branch is skipped.
								break; // Ends invalid strategy branch.
						} // Closes fit-strategy switch.
						if (block_id >= 0) { // Handles successful allocation when allocator returned valid block ID.
							target_process = get_process_by_pid(pid); // Retrieves PCB pointer so process metadata can reflect allocated block.
							if (target_process != NULL) { // Checks process existence before writing PCB memory fields.
								target_process->memory_start = block_id; // Stores allocated block ID in PCB for process-memory linkage.
								target_process->memory_required = size; // Stores requested memory size for process-level accounting.
							} // Closes PCB-update branch after optional metadata synchronization.
							printf("Memory allocated successfully: block_id=%d\n", block_id); // Prints allocation success feedback to user.
							log_info("Memory action: allocation completed successfully."); // Logs successful memory allocation event.
						} else { // Handles allocation failure returned by selected strategy.
							printf("Memory allocation failed: no suitable block found.\n"); // Prints failure reason for user awareness.
							log_warning("Memory action: allocation failed due to insufficient suitable space."); // Logs failed allocation for diagnostics.
						} // Closes allocation success/failure branch.
						log_memory_state(); // Logs memory snapshot after allocation attempt so map evolution is auditable.
						break; // Ends 3a memory allocation branch.
					} // Closes scoped allocation case block.
					case 'b': // Handles freeing memory owned by a PID.
						if (read_int_value("Enter PID to free memory for: ", &pid) == 0) { // Reads PID input for free operation.
							printf("Invalid PID input.\n"); // Reports parse failure for free request PID.
							log_warning("Memory action: invalid PID input for free operation."); // Logs invalid free-input attempt.
							break; // Leaves free branch because PID is required.
						} // Closes PID parse branch for free operation.
						free_memory(pid); // Calls free_memory so all blocks owned by PID are released.
						printf("Memory free operation completed for PID %d.\n", pid); // Prints confirmation for free workflow completion.
						log_info("Memory action: free operation executed."); // Logs memory free action as major event.
						log_memory_state(); // Logs updated memory snapshot after freeing resources.
						break; // Ends 3b memory free branch.
					case 'c': // Handles memory map viewing.
						display_memory_map(); // Calls map display API so operator can inspect current block layout.
						log_info("Memory action: viewed memory map."); // Logs map-view action for audit timeline.
						log_memory_state(); // Logs snapshot after view so file log captures currently displayed state.
						break; // Ends 3c memory view branch.
					default: // Handles unsupported memory submenu letters.
						printf("Invalid Memory Management sub-option.\n"); // Informs user that submenu option is not valid.
						log_warning("Memory action: unknown submenu option selected."); // Logs unsupported memory submenu usage.
						break; // Ends invalid memory-submenu handling.
				} // Closes Memory Management submenu switch.
				break; // Ends top-level case 3 handling.
			case 4: // Handles IPC demo menu action.
				demonstrate_ipc(); // Calls IPC demo to run pipe and message-queue communication showcase.
				log_info("IPC action: ran communication demonstration."); // Logs IPC demo execution as major system action.
				break; // Ends top-level case 4 handling.
			case 5: // Handles Deadlock Management menu group.
				if (read_char_value("Select sub-option for Deadlock Management (a/b/c/d): ", &sub_choice) == 0) { // Reads deadlock submenu option safely.
					printf("Invalid deadlock sub-option input.\n"); // Reports deadlock submenu parse failure.
					log_warning("Deadlock action: invalid submenu input provided."); // Logs invalid deadlock submenu attempt.
					break; // Leaves case because no valid deadlock action was selected.
				} // Closes deadlock submenu parse branch.
				switch (sub_choice) { // Dispatches selected deadlock/resource action.
					case 'a': // Handles resource allocation table display.
						display_resource_table(); // Calls table display so operator can inspect Banker matrices.
						log_info("Deadlock action: viewed resource allocation table."); // Logs table-view action.
						break; // Ends 5a deadlock branch.
					case 'b': // Handles resource request attempt for one PID.
						if (read_int_value("Enter PID/index for request: ", &pid) == 0) { // Reads target process index for request_resources.
							printf("Invalid PID input.\n"); // Reports PID parse failure for resource request.
							log_warning("Deadlock action: invalid PID input for request."); // Logs invalid request PID attempt.
							break; // Leaves 5b branch because request vector needs valid process index.
						} // Closes PID parse branch for resource request.
						if (read_int_value("Request radio_channels: ", &request[0]) == 0) { // Reads requested radio channel units.
							printf("Invalid request value for radio_channels.\n"); // Reports parse failure for first resource component.
							log_warning("Deadlock action: invalid radio_channels request input."); // Logs invalid vector component input.
							break; // Leaves branch because full request vector is required.
						} // Closes first request-component parse branch.
						if (read_int_value("Request ambulances: ", &request[1]) == 0) { // Reads requested ambulance units.
							printf("Invalid request value for ambulances.\n"); // Reports parse failure for second resource component.
							log_warning("Deadlock action: invalid ambulances request input."); // Logs invalid vector component input.
							break; // Leaves branch because request vector parsing failed.
						} // Closes second request-component parse branch.
						if (read_int_value("Request fire_trucks: ", &request[2]) == 0) { // Reads requested fire truck units.
							printf("Invalid request value for fire_trucks.\n"); // Reports parse failure for third resource component.
							log_warning("Deadlock action: invalid fire_trucks request input."); // Logs invalid vector component input.
							break; // Leaves branch because request vector parsing failed.
						} // Closes third request-component parse branch.
						if (read_int_value("Request police_cars: ", &request[3]) == 0) { // Reads requested police car units.
							printf("Invalid request value for police_cars.\n"); // Reports parse failure for fourth resource component.
							log_warning("Deadlock action: invalid police_cars request input."); // Logs invalid vector component input.
							break; // Leaves branch because request vector parsing failed.
						} // Closes fourth request-component parse branch.
						if (request_resources(pid, request) == 1) { // Calls Banker request check and evaluates grant/deny result.
							log_info("Deadlock action: resource request granted in safe state."); // Logs granted request outcome.
						} else { // Handles denied request result.
							log_warning("Deadlock action: resource request denied."); // Logs denied request for auditing unsafe or invalid demand.
						} // Closes grant/deny result branch.
						break; // Ends 5b deadlock branch.
					case 'c': // Handles explicit Banker's safety check action.
						if (is_safe_state() == 1) { // Calls safety algorithm and checks safe-state result.
							printf("Banker's safety check: SAFE state.\n"); // Prints safe-state confirmation for operator.
							log_info("Deadlock action: safety check returned SAFE."); // Logs safe-state check result.
						} else { // Handles unsafe-state result.
							printf("Banker's safety check: UNSAFE state.\n"); // Prints unsafe warning for operator awareness.
							log_warning("Deadlock action: safety check returned UNSAFE."); // Logs unsafe-state result as warning.
						} // Closes safety check result branch.
						break; // Ends 5c deadlock branch.
					case 'd': // Handles deadlock detection run.
						if (detect_deadlock() == 1) { // Calls detector and checks whether blocked set is found.
							log_critical("Deadlock action: potential deadlock detected."); // Logs detection result as critical because progress may halt.
						} else { // Handles no-deadlock result.
							log_info("Deadlock action: no deadlock detected."); // Logs healthy detection result.
						} // Closes deadlock detection result branch.
						break; // Ends 5d deadlock branch.
					default: // Handles unsupported deadlock submenu letters.
						printf("Invalid Deadlock Management sub-option.\n"); // Informs user of unsupported submenu choice.
						log_warning("Deadlock action: unknown submenu option selected."); // Logs unsupported deadlock submenu usage.
						break; // Ends invalid deadlock-submenu handling.
				} // Closes Deadlock Management submenu switch.
				break; // Ends top-level case 5 handling.
			case 6: // Handles File Log menu group.
				if (read_char_value("Select sub-option for File Log (a/b): ", &sub_choice) == 0) { // Reads file-log submenu option safely.
					printf("Invalid file log sub-option input.\n"); // Reports parse failure for file-log submenu.
					log_warning("File log action: invalid submenu input provided."); // Logs invalid file-log submenu attempt.
					break; // Leaves case because no valid file-log action selected.
				} // Closes file-log submenu parse branch.
				switch (sub_choice) { // Dispatches file-log action by submenu letter.
					case 'a': // Handles log file display action.
						display_log(); // Calls display_log so entire persisted log is printed to console.
						log_info("File log action: viewed system log."); // Logs log-view action for auditing operator access.
						break; // Ends 6a branch.
					case 'b': // Handles log file clear/reset action.
						clear_log(); // Calls clear_log so file is truncated and reset header is written.
						log_info("File log action: cleared system log."); // Logs clear operation in newly reset log file.
						break; // Ends 6b branch.
					default: // Handles unsupported file-log submenu letters.
						printf("Invalid File Log sub-option.\n"); // Informs user of invalid submenu selection.
						log_warning("File log action: unknown submenu option selected."); // Logs unsupported file-log submenu usage.
						break; // Ends invalid file-log-submenu handling.
				} // Closes File Log submenu switch.
				break; // Ends top-level case 6 handling.
			case 7: // Handles automated live demo scenario execution.
				run_demo_scenario(); // Calls scripted demo function to showcase integrated subsystem behavior end-to-end.
				log_info("System action: completed live demo scenario run."); // Logs full demo completion as major presentation event.
				break; // Ends top-level case 7 handling.
			case 0: // Handles explicit exit request.
				log_info("System action: exit requested by user."); // Logs user exit action before terminating loop.
				printf("Exiting SERC Mini-OS. Stay safe.\n"); // Prints friendly exit message for operator.
				break; // Ends top-level case 0 handling.
			default: // Handles unsupported top-level numeric options.
				printf("Invalid main option. Please choose 0-7.\n"); // Informs user that entered top-level option is out of range.
				log_warning("Invalid main menu option selected."); // Logs invalid top-level option usage.
				break; // Ends invalid-main-option handling.
		} // Closes top-level menu switch.
	} while (main_choice != 0); // Repeats menu until user explicitly selects option 0 to exit.
	return 0; // Returns success code because application ended through controlled menu flow.
} // Ends main entry point after menu loop termination.
