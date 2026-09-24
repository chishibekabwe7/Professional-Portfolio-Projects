/*
 * Filename: process.c
 * Purpose: Implements process lifecycle operations for the mini-os emergency response simulation.
 * Author: 
 * Date: 2026-04-
 */
#include <stdio.h> // We include stdio so the module can prompt users and print process-table output.
#include <string.h> // We include string helpers so we can safely set a fallback task name when needed.
#include "../include/process.h" // We include the process header so these definitions match declared data types and APIs.

static int process_count = 0; // We store the current process count so we only iterate over populated PCB entries.
static int next_pid = 1; // We keep a monotonically increasing PID so each created process has a stable unique identifier.

static void clear_input_buffer(void) { // We centralize input-buffer cleanup to prevent leftover characters from corrupting later prompts.
	int ch = 0; // We use a temporary character holder so we can consume stdin one byte at a time.
	while ((ch = getchar()) != '\n' && ch != EOF) { // We discard characters until end-of-line or EOF because scanf leaves trailing input behind.
	} // We intentionally keep the loop body empty because consuming characters is the only required side effect.
} // We end the helper here so any function can reuse reliable input cleanup behavior.

static int read_bounded_int(const char *prompt, int minimum, int maximum) { // We isolate validated numeric input so repeated checks stay consistent and maintainable.
	int value = 0; // We allocate storage for the user's numeric input so we can validate range before accepting it.
	int scan_result = 0; // We track scanf status so non-numeric input can be rejected safely.
	while (1) { // We loop until valid input is received so callers always get a usable value.
		printf("%s", prompt); // We print the caller-supplied prompt so users know exactly which field to provide.
		scan_result = scanf("%d", &value); // We attempt to parse an integer because scheduling fields are numeric by design.
		if (scan_result != 1) { // We handle failed conversion to avoid leaving invalid data in the process table.
			printf("Invalid input. Please enter a numeric value.\n"); // We explain the error so the user can correct the next attempt.
			clear_input_buffer(); // We clear bad input remnants so the next scanf call starts from a clean line.
			continue; // We restart the loop because no valid integer was captured.
		} // We close the invalid-input branch after recovering from parsing failure.
		clear_input_buffer(); // We remove trailing newline characters so future prompts are not skipped.
		if (value < minimum || value > maximum) { // We enforce field constraints so process metadata remains within expected limits.
			printf("Please enter a value between %d and %d.\n", minimum, maximum); // We report valid bounds to guide correction.
			continue; // We retry because out-of-range input would make scheduler behavior inconsistent.
		} // We close range validation after either accepting or retrying.
		return value; // We return the validated number because callers can now safely store it.
	} // We close the validation loop after a guaranteed return path.
} // We end bounded integer reading helper to reuse this logic across multiple fields.

static int read_minimum_int(const char *prompt, int minimum) { // We isolate minimum-only numeric validation for fields without a strict upper bound.
	int value = 0; // We reserve space for the user's numeric input so we can test constraints before acceptance.
	int scan_result = 0; // We track conversion success so non-numeric entries can be rejected gracefully.
	while (1) { // We keep asking until input is valid so callers do not need duplicate validation code.
		printf("%s", prompt); // We show a clear prompt so users know what value the system expects.
		scan_result = scanf("%d", &value); // We parse an integer because timing and memory fields must be numeric.
		if (scan_result != 1) { // We detect bad input early so invalid characters never propagate into the PCB.
			printf("Invalid input. Please enter a numeric value.\n"); // We explain the issue so users can fix the next attempt.
			clear_input_buffer(); // We purge invalid characters so subsequent scans behave predictably.
			continue; // We request input again because no usable number was read.
		} // We close failed-conversion handling after cleanup.
		clear_input_buffer(); // We consume trailing newline so the next prompt receives fresh input.
		if (value < minimum) { // We enforce the minimum threshold to keep simulation values logical.
			printf("Please enter a value greater than or equal to %d.\n", minimum); // We provide exact guidance so users can correct quickly.
			continue; // We retry because accepting too-small values would break scheduling assumptions.
		} // We close minimum check after either accepting or retrying.
		return value; // We return the validated integer because constraints have now been satisfied.
	} // We close loop scope once a return exits with valid data.
} // We end minimum-only reader helper so creation code stays concise and readable.

static const char *process_state_to_string(ProcessState state) { // We convert enum states to readable text so tables are understandable to humans.
	switch (state) { // We branch by state value because each enum constant maps to a distinct label.
		case NEW: // We handle the NEW state explicitly so freshly created tasks display clearly.
			return "NEW"; // We return a stable literal so formatted output remains consistent.
		case READY: // We handle the READY state so queued tasks are visible without integer decoding.
			return "READY"; // We return the exact state name to match OS terminology.
		case RUNNING: // We handle RUNNING separately so active CPU work is obvious in diagnostics.
			return "RUNNING"; // We return this string because operators read words faster than enum ordinals.
		case WAITING: // We handle WAITING so blocked tasks can be distinguished from runnable tasks.
			return "WAITING"; // We return the canonical label to keep status reporting unambiguous.
		case TERMINATED: // We handle TERMINATED so finished tasks are clearly marked in reports.
			return "TERMINATED"; // We return this text so lifecycle completion is explicit to users.
		default: // We include a fallback in case future enum changes introduce unexpected values.
			return "UNKNOWN"; // We return a sentinel label so invalid state data is visible during debugging.
	} // We close switch because each state has now been mapped to a user-friendly string.
} // We end state conversion helper so display code can stay simple.

static const char *emergency_type_to_string(EmergencyType type) { // We convert emergency unit enums to names so table output is operationally meaningful.
	switch (type) { // We branch by emergency type because each unit class needs its own label.
		case AMBULANCE: // We handle ambulance jobs explicitly so medical tasks are easy to identify.
			return "AMBULANCE"; // We return the unit name to avoid presenting opaque numeric values.
		case FIRE: // We handle fire-response jobs so firefighting tasks are grouped clearly.
			return "FIRE"; // We return FIRE because concise unit labels improve dashboard readability.
		case POLICE: // We handle police jobs so law-enforcement tasks appear with correct identity.
			return "POLICE"; // We return POLICE to keep dispatch category output explicit.
		default: // We include a fallback so unexpected type values are still diagnosable.
			return "UNKNOWN"; // We return UNKNOWN to signal data integrity issues without crashing.
	} // We close switch after mapping all known emergency type values.
} // We end emergency type conversion helper to keep display formatting centralized.

void create_process(void) { // We implement process creation so operators can register new emergency tasks at runtime.
	PCB *new_process = NULL; // We keep a pointer to the target PCB slot so assignments remain concise and clear.
	int emergency_option = 0; // We capture the user's menu-style emergency type choice before enum conversion.
	int scan_result = 0; // We track name input success so we can recover safely from empty/invalid entries.
	if (process_count >= MAX_PROCESSES) { // We enforce table capacity to avoid writing beyond allocated PCB storage.
		printf("Process table is full. Cannot create more than %d processes.\n", MAX_PROCESSES); // We explain refusal so users know capacity is the reason.
		return; // We exit early because no valid slot exists for an additional process.
	} // We close capacity guard once space availability has been resolved.
	new_process = &process_table[process_count]; // We select the next free table slot so new data does not overwrite existing processes.
	new_process->pid = next_pid; // We assign the current PID value so each process can be referenced uniquely.
	next_pid = next_pid + 1; // We increment PID counter immediately so the next process receives a new identifier.
	printf("\n--- Create Emergency Task ---\n"); // We print a section header to separate creation prompts from other menu output.
	printf("Enter task name: "); // We ask for a human-readable task name so operators can identify jobs quickly.
	scan_result = scanf(" %49[^\n]", new_process->name); // We read up to 49 characters to allow spaces while preventing buffer overflow.
	if (scan_result != 1) { // We handle failed name capture so the PCB never contains uninitialized text.
		strcpy(new_process->name, "Unnamed Task"); // We assign a safe default name to keep records valid and printable.
		clear_input_buffer(); // We remove residual input so subsequent numeric prompts remain aligned.
		printf("No valid name entered. Using default name \"Unnamed Task\".\n"); // We inform users about fallback behavior for transparency.
	} else { // We enter this branch when a valid task name was captured.
		clear_input_buffer(); // We consume the trailing newline so the next prompt can read cleanly.
	} // We close name handling after either fallback or normal capture.
	printf("Emergency type options: 1=AMBULANCE, 2=FIRE, 3=POLICE\n"); // We show mapping so users can select a valid emergency unit code.
	emergency_option = read_bounded_int("Select emergency type (1-3): ", 1, 3); // We enforce valid menu range to guarantee safe enum conversion.
	new_process->type = (EmergencyType)(emergency_option - 1); // We convert 1-based user input into 0-based enum constants for storage.
	new_process->priority = read_bounded_int("Enter priority (1=low to 5=critical): ", 1, 5); // We constrain priority to policy-defined scheduler levels.
	new_process->arrival_time = read_minimum_int("Enter arrival time (>=0): ", 0); // We reject negative arrival times because they are not physically meaningful.
	new_process->burst_time = read_minimum_int("Enter burst time (>0): ", 1); // We require positive CPU demand so the process has actual work to schedule.
	new_process->memory_required = read_minimum_int("Enter memory required in MB (>0): ", 1); // We require positive memory demand to avoid invalid allocation requests.
	new_process->state = NEW; // We initialize lifecycle state to NEW because the process was just created and not yet scheduled.
	new_process->remaining_time = new_process->burst_time; // We mirror burst time initially so RR scheduling has full work remaining.
	new_process->waiting_time = 0; // We reset waiting metric because scheduling has not yet started accumulating delay.
	new_process->turnaround_time = 0; // We reset turnaround metric because completion timing is not known at creation.
	new_process->memory_start = -1; // We mark memory as unallocated so allocators can detect that no block is assigned yet.
	process_count = process_count + 1; // We advance the active count so future operations include the new PCB entry.
	printf("Process created: PID=%d | Name=%s | Type=%s | Priority=%d\n", new_process->pid, new_process->name, emergency_type_to_string(new_process->type), new_process->priority); // We print confirmation so operators can verify stored details immediately.
} // We end process creation after fully initializing and registering the new PCB.

void display_process_table(void) { // We implement table display so users can inspect the full scheduling dataset at any time.
	int index = 0; // We keep an index variable for controlled iteration across populated process slots.
	if (process_count == 0) { // We handle empty-table state so output remains informative when no tasks exist.
		printf("Process table is empty.\n"); // We notify users explicitly to avoid confusion from a blank listing.
		return; // We exit early because there are no entries available to print.
	} // We close empty-table guard before rendering headers and rows.
	printf("\n============================== PROCESS TABLE ==============================\n"); // We print a banner to visually separate the table from other output.
	printf("%-4s %-20s %-10s %-11s %-8s %-8s %-8s %-10s %-10s %-13s %-10s %-10s\n", "PID", "NAME", "TYPE", "STATE", "PRIORITY", "ARRIVAL", "BURST", "REMAIN", "WAIT", "TURNAROUND", "MEM(MB)", "MEM_START"); // We print column headers so each PCB field aligns with its displayed value.
	printf("-------------------------------------------------------------------------------" "----------------\n"); // We print a separator line to improve readability across many records.
	for (index = 0; index < process_count; index++) { // We iterate only across populated entries so uninitialized slots are never displayed.
		printf("%-4d %-20.20s %-10s %-11s %-8d %-8d %-8d %-10d %-10d %-13d %-10d %-10d\n", process_table[index].pid, process_table[index].name, emergency_type_to_string(process_table[index].type), process_state_to_string(process_table[index].state), process_table[index].priority, process_table[index].arrival_time, process_table[index].burst_time, process_table[index].remaining_time, process_table[index].waiting_time, process_table[index].turnaround_time, process_table[index].memory_required, process_table[index].memory_start); // We print every required PCB field so monitoring output is complete and consistent.
	} // We finish iterating after printing all active process entries.
} // We end display function after presenting the formatted process table.

void terminate_process(int pid) { // We implement termination so external logic can stop a process by its PID.
	PCB *process = get_process_by_pid(pid); // We reuse PID lookup helper so termination logic stays focused and avoids duplicate search code.
	if (process == NULL) { // We handle missing PID safely so invalid requests do not dereference null pointers.
		printf("Process with PID %d not found.\n", pid); // We report lookup failure so the operator can retry with a correct identifier.
		return; // We exit because no target process exists to terminate.
	} // We close not-found handling after safely returning.
	process->state = TERMINATED; // We mark the lifecycle as terminated so schedulers know this task must not run again.
	process->memory_start = -1; // We clear allocated block reference to represent memory release for this process.
	printf("Process with PID %d has been terminated.\n", pid); // We confirm action so operators can audit termination events.
} // We end termination routine after state and memory flags are updated.

PCB *get_process_by_pid(int pid) { // We implement PID lookup so other modules can obtain direct PCB access for targeted operations.
	int index = 0; // We define an index counter because we need sequential scanning through active entries.
	for (index = 0; index < process_count; index++) { // We scan only active rows to keep lookup predictable and efficient.
		if (process_table[index].pid == pid) { // We compare each stored PID so we can identify the exact process requested.
			return &process_table[index]; // We return the PCB address so callers can modify or inspect this process in place.
		} // We close equality check before continuing scan on non-matching entries.
	} // We finish scanning after all active process records have been examined.
	return NULL; // We return NULL to signal that the requested PID does not exist in the process table.
} // We end PID lookup after either finding a match or proving absence.
