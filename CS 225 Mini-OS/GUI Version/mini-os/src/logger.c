/*
 * Filename: logger.c
 * Purpose: Implements timestamped file logging for events, scheduling metrics, and memory-state snapshots.
 * Author: 
 * Date: 2026-04-
 */
#include <stdio.h> // Provides fopen, fclose, fprintf, fgets, and printf for file and console I/O operations.
#include <time.h> // Provides time structures and functions needed for timestamp generation in log records.
#include "../include/logger.h" // Provides logger API declarations and LogLevel definitions used by this implementation.
#include "../include/memory.h" // Provides memory map structures so logger can record current memory-state snapshots.

static const char *level_to_string(LogLevel level) { // Converts enum log levels into readable labels for consistent file output.
	switch (level) { // Switches by level because each severity enum maps to a fixed output string.
		case SERC_LOG_INFO: // Handles informational events that describe normal operational flow.
			return "INFO"; // Returns INFO label so routine messages are clearly identified in the log.
		case SERC_LOG_WARNING: // Handles warning events that indicate degraded conditions needing attention.
			return "WARNING"; // Returns WARNING label so potential risk messages stand out to operators.
		case SERC_LOG_CRITICAL: // Handles critical events that may impact safety or emergency response readiness.
			return "CRITICAL"; // Returns CRITICAL label so high-severity incidents are immediately visible.
		default: // Handles unexpected enum values to keep logger robust against invalid inputs.
			return "UNKNOWN"; // Returns UNKNOWN label so malformed severity values remain diagnosable.
	} // Closes severity mapping switch after all enum cases are handled.
} // Ends level-to-string helper after returning normalized severity text.

void init_log(void) { // Initializes logging by appending a new session header with current timestamp.
	FILE *log_fp = NULL; // Holds file pointer so append-mode log writes can be performed safely.
	time_t now = 0; // Stores current epoch time so session start moment can be converted to readable text.
	struct tm *local_time_info = NULL; // Holds broken-down local time used for human-friendly timestamp formatting.
	char timestamp[64] = {0}; // Stores formatted timestamp string included in session header lines.
	log_fp = fopen(LOG_FILE, "a"); // Calls fopen in append mode so new session headers are added without erasing history.
	if (log_fp == NULL) { // Checks fopen result so disk/path permission failures are handled safely.
		perror("LOGGER: fopen() failed in init_log"); // Reports fopen failure reason to help operators diagnose logging availability.
		return; // Exits because logger cannot write session header without a valid file handle.
	} // Closes fopen failure branch before timestamp and header writes.
	now = time(NULL); // Calls time() to obtain current calendar time used to timestamp session start.
	if (now == (time_t)-1) { // Checks time() result so timestamp generation failures are caught explicitly.
		fprintf(log_fp, "\n================ LOG SESSION START ================\n"); // Calls fprintf to still mark session start even when clock lookup fails.
		fprintf(log_fp, "[TIME_UNAVAILABLE] Logger session initialized without timestamp.\n"); // Calls fprintf to document missing timestamp for audit transparency.
		fprintf(log_fp, "===================================================\n"); // Calls fprintf to close session-header block for readable log structure.
		fclose(log_fp); // Calls fclose to flush and release the file handle after writing fallback header text.
		return; // Exits because valid timestamp text cannot be built when time() fails.
	} // Closes time() failure branch before normal timestamp formatting path.
	local_time_info = localtime(&now); // Calls localtime to convert epoch seconds into local calendar components.
	if (local_time_info == NULL) { // Checks localtime result so null conversion pointers are handled defensively.
		fprintf(log_fp, "\n================ LOG SESSION START ================\n"); // Calls fprintf to keep session boundary visible despite conversion failure.
		fprintf(log_fp, "[TIME_UNAVAILABLE] Logger session initialized without localtime conversion.\n"); // Calls fprintf to explain why readable time text is absent.
		fprintf(log_fp, "===================================================\n"); // Calls fprintf to preserve consistent header/footer framing.
		fclose(log_fp); // Calls fclose to release file handle after fallback writes.
		return; // Exits because strftime cannot run without valid broken-down time structure.
	} // Closes localtime failure branch before timestamp formatting.
	if (strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", local_time_info) == 0U) { // Calls strftime to format local time into readable log timestamp string.
		fprintf(log_fp, "\n================ LOG SESSION START ================\n"); // Calls fprintf to print session header even when formatting buffer was insufficient.
		fprintf(log_fp, "[TIME_UNAVAILABLE] Logger session initialized but timestamp formatting failed.\n"); // Calls fprintf to record why formatted time could not be produced.
		fprintf(log_fp, "===================================================\n"); // Calls fprintf to close fallback session header cleanly.
		fclose(log_fp); // Calls fclose to flush output and release file handle before return.
		return; // Exits because timestamp formatting did not produce valid text.
	} // Closes strftime failure branch before normal header write path.
	fprintf(log_fp, "\n================ LOG SESSION START ================\n"); // Calls fprintf to write a visually distinct session start separator.
	fprintf(log_fp, "[%s] Logger session initialized.\n", timestamp); // Calls fprintf to persist formatted session-start timestamp for audit tracking.
	fprintf(log_fp, "===================================================\n"); // Calls fprintf to close session-start section for readability.
	fclose(log_fp); // Calls fclose to flush buffered content and release append-mode file descriptor.
} // Ends logger initialization after writing session-start metadata to file.

void log_event(LogLevel level, char *message) { // Writes one timestamped event line with severity tag into the log file.
	FILE *log_fp = NULL; // Holds file pointer used for append-mode event writes.
	time_t now = 0; // Stores current epoch time used for event timestamping.
	struct tm *local_time_info = NULL; // Holds local broken-down time for human-readable event timestamps.
	char timestamp[64] = {0}; // Stores formatted event timestamp string.
	const char *level_text = NULL; // Stores severity label string resolved from LogLevel enum.
	/*
	 * Logging is critical in emergency systems because operators must reconstruct event timelines during incidents.
	 * High-quality logs support accountability, post-incident analysis, legal auditability, and rapid fault diagnosis.
	 * Timestamped severity-tagged records also help prioritize response when multiple alerts occur simultaneously.
	 */
	if (message == NULL) { // Validates message pointer so logger never dereferences a null event payload.
		return; // Exits silently because writing a null message would not provide meaningful audit information.
	} // Closes null-message guard branch.
	level_text = level_to_string(level); // Resolves level enum to text so each log line carries readable severity context.
	log_fp = fopen(LOG_FILE, "a"); // Calls fopen in append mode so each event is added without deleting prior evidence.
	if (log_fp == NULL) { // Checks fopen result so disk access failures do not crash caller workflows.
		perror("LOGGER: fopen() failed in log_event"); // Reports fopen failure to surface inability to persist emergency audit entries.
		return; // Exits because event cannot be written without a valid file stream.
	} // Closes fopen-failure branch before time capture and write path.
	now = time(NULL); // Calls time() to capture current timestamp for this event record.
	if (now == (time_t)-1) { // Handles time failure so logger still records message with fallback time label.
		fprintf(log_fp, "[TIME_UNAVAILABLE][%s] %s\n", level_text, message); // Calls fprintf to persist event even when clock lookup fails.
		fclose(log_fp); // Calls fclose to flush fallback event line and release file handle.
		return; // Exits because normal timestamp formatting cannot continue after time() failure.
	} // Closes time() failure branch.
	local_time_info = localtime(&now); // Calls localtime to translate epoch seconds into local date/time fields.
	if (local_time_info == NULL) { // Handles localtime failure so event is still captured with fallback timestamp marker.
		fprintf(log_fp, "[TIME_UNAVAILABLE][%s] %s\n", level_text, message); // Calls fprintf to retain event content despite conversion failure.
		fclose(log_fp); // Calls fclose to flush fallback line and release file stream.
		return; // Exits because strftime cannot run when localtime conversion fails.
	} // Closes localtime failure branch.
	if (strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", local_time_info) == 0U) { // Calls strftime to format readable timestamp for log-line prefix.
		fprintf(log_fp, "[TIME_UNAVAILABLE][%s] %s\n", level_text, message); // Calls fprintf to retain event with fallback timestamp on formatting failure.
		fclose(log_fp); // Calls fclose so fallback record is committed before function returns.
		return; // Exits because no valid formatted timestamp text is available.
	} // Closes strftime failure branch.
	fprintf(log_fp, "[%s][%s] %s\n", timestamp, level_text, message); // Calls fprintf to write canonical timestamped severity-tagged event line.
	fclose(log_fp); // Calls fclose to flush event record and release append handle promptly.
} // Ends event logger after one complete file write attempt.

void log_schedule_result(ScheduleResult r) { // Writes scheduler performance metrics to the log for post-run analysis.
	FILE *log_fp = NULL; // Holds file pointer used for metrics block append operation.
	time_t now = 0; // Stores current time for tagging when these metrics were recorded.
	struct tm *local_time_info = NULL; // Holds local calendar breakdown used for readable timestamp formatting.
	char timestamp[64] = {0}; // Stores formatted timestamp text for metrics header line.
	log_fp = fopen(LOG_FILE, "a"); // Calls fopen in append mode so new metric blocks preserve previous operational history.
	if (log_fp == NULL) { // Checks fopen result so I/O failures are surfaced instead of silently ignored.
		perror("LOGGER: fopen() failed in log_schedule_result"); // Reports file-open failure to notify that metrics were not persisted.
		return; // Exits because metrics cannot be written without a valid stream.
	} // Closes file-open failure branch.
	now = time(NULL); // Calls time() to stamp this metric snapshot with current clock time.
	if (now != (time_t)-1) { // Uses normal timestamp path when time() succeeds.
		local_time_info = localtime(&now); // Calls localtime to obtain local date/time fields for formatting.
		if (local_time_info != NULL && strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", local_time_info) != 0U) { // Calls strftime to generate readable timestamp when conversion is valid.
			fprintf(log_fp, "[%s][SCHEDULER] avg_wait=%.2f avg_turnaround=%.2f cpu_util=%.2f%%\n", timestamp, r.avg_waiting_time, r.avg_turnaround_time, r.cpu_utilization); // Calls fprintf to record metrics with explicit timestamp and values.
		} else { // Handles localtime/strftime failure while still preserving metric values.
			fprintf(log_fp, "[TIME_UNAVAILABLE][SCHEDULER] avg_wait=%.2f avg_turnaround=%.2f cpu_util=%.2f%%\n", r.avg_waiting_time, r.avg_turnaround_time, r.cpu_utilization); // Calls fprintf to persist metrics with fallback time marker.
		} // Closes formatting-success branch for metrics record.
	} else { // Handles time() failure while still writing scheduler metrics.
		fprintf(log_fp, "[TIME_UNAVAILABLE][SCHEDULER] avg_wait=%.2f avg_turnaround=%.2f cpu_util=%.2f%%\n", r.avg_waiting_time, r.avg_turnaround_time, r.cpu_utilization); // Calls fprintf to preserve data despite missing clock value.
	} // Closes time() success/failure branch for metrics logging.
	fclose(log_fp); // Calls fclose to commit metric block and release file resource.
} // Ends schedule-result logger after writing one metrics record.

void log_memory_state(void) { // Writes a snapshot of the current memory map into the log for allocator diagnostics.
	FILE *log_fp = NULL; // Holds file pointer used for appending memory-state snapshot lines.
	time_t now = 0; // Stores current epoch time for timestamping this memory snapshot.
	struct tm *local_time_info = NULL; // Holds converted local time structure for readable header timestamp.
	char timestamp[64] = {0}; // Stores formatted timestamp text used in snapshot header.
	int index = 0; // Iterates through memory-map entries while writing block status lines.
	int fragmentation = 0; // Stores fragmentation metric so snapshot includes allocator-health summary.
	log_fp = fopen(LOG_FILE, "a"); // Calls fopen in append mode so memory snapshots are added chronologically.
	if (log_fp == NULL) { // Checks fopen result so storage failures are not silently ignored.
		perror("LOGGER: fopen() failed in log_memory_state"); // Reports open failure so operators know memory snapshot was not persisted.
		return; // Exits because snapshot writing requires valid file stream.
	} // Closes open-failure branch.
	now = time(NULL); // Calls time() to stamp memory snapshot creation moment.
	if (now != (time_t)-1) { // Uses normal timestamp path when time lookup succeeds.
		local_time_info = localtime(&now); // Calls localtime to convert epoch into local date/time fields.
		if (local_time_info != NULL && strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", local_time_info) != 0U) { // Calls strftime to produce readable timestamp string for snapshot header.
			fprintf(log_fp, "[%s][MEMORY] Snapshot begin\n", timestamp); // Calls fprintf to begin snapshot block with explicit timestamp.
		} else { // Handles conversion/formatting failure while retaining snapshot semantics.
			fprintf(log_fp, "[TIME_UNAVAILABLE][MEMORY] Snapshot begin\n"); // Calls fprintf to mark snapshot start when formatted time is unavailable.
		} // Closes timestamp-format success branch.
	} else { // Handles time() failure while still writing memory snapshot.
		fprintf(log_fp, "[TIME_UNAVAILABLE][MEMORY] Snapshot begin\n"); // Calls fprintf to ensure snapshot still exists even without clock value.
	} // Closes time() success/failure branch for memory snapshot header.
	for (index = 0; index < MAX_BLOCKS; index++) { // Scans all map entries so both active and default slots can be evaluated for logging.
		if (memory_map[index].size <= 0) { // Skips inactive descriptors because they do not represent usable memory blocks.
			continue; // Moves to next entry so log remains focused on meaningful block data.
		} // Closes inactive-entry guard branch.
		if (memory_map[index].is_free == 1) { // Handles free block output format separately for clearer status labeling.
			fprintf(log_fp, "  Block %02d | Start=%3dMB | Size=%3dMB | [FREE]\n", memory_map[index].block_id, memory_map[index].start_address, memory_map[index].size); // Calls fprintf to record free block location and size for fragmentation analysis.
		} else { // Handles allocated block output so owner PID is recorded in snapshot.
			fprintf(log_fp, "  Block %02d | Start=%3dMB | Size=%3dMB | [USED:%d]\n", memory_map[index].block_id, memory_map[index].start_address, memory_map[index].size, memory_map[index].allocated_to_pid); // Calls fprintf to record used block metadata and owning process.
		} // Closes free-vs-used output branch for this block.
	} // Closes memory-map scan loop after all active entries are logged.
	fragmentation = calculate_fragmentation(); // Computes fragmentation metric so snapshot includes allocator health signal.
	fprintf(log_fp, "  Fragmentation estimate: %d MB\n", fragmentation); // Calls fprintf to persist fragmentation total alongside block snapshot.
	fprintf(log_fp, "[MEMORY] Snapshot end\n"); // Calls fprintf to mark end of snapshot block for easier log parsing.
	fclose(log_fp); // Calls fclose to flush snapshot lines and release file stream.
} // Ends memory-state logger after writing full snapshot section.

void display_log(void) { // Opens the log file and prints every line to console for quick operational review.
	FILE *log_fp = NULL; // Holds read-mode file pointer used to stream log contents.
	char line_buffer[512] = {0}; // Stores each line read from file before printing to standard output.
	log_fp = fopen(LOG_FILE, "r"); // Calls fopen in read mode so existing log file content can be displayed.
	if (log_fp == NULL) { // Checks fopen result so missing-file or permission issues are handled cleanly.
		perror("LOGGER: fopen() failed in display_log"); // Reports open failure reason so user knows why log cannot be shown.
		return; // Exits because no readable stream exists for display.
	} // Closes open-failure branch.
	printf("\n================ SERC LOG CONTENTS ================\n"); // Prints heading so displayed log content is clearly separated in console.
	while (fgets(line_buffer, sizeof(line_buffer), log_fp) != NULL) { // Calls fgets repeatedly to read file line-by-line without overflowing buffer.
		printf("%s", line_buffer); // Prints each fetched line so console view matches file contents exactly.
	} // Closes fgets loop after end-of-file is reached.
	printf("===================================================\n"); // Prints footer line so log display section has clear endpoint.
	fclose(log_fp); // Calls fclose to release read handle after full-file display completes.
} // Ends display function after printing complete log file.

void clear_log(void) { // Clears log file contents by overwriting and writing a fresh reset header.
	FILE *log_fp = NULL; // Holds write-mode stream used to recreate log file from scratch.
	time_t now = 0; // Stores current time for reset-header timestamp.
	struct tm *local_time_info = NULL; // Holds local time structure used for formatting readable reset timestamp.
	char timestamp[64] = {0}; // Stores formatted reset timestamp text.
	log_fp = fopen(LOG_FILE, "w"); // Calls fopen in write mode so prior log content is truncated and file starts fresh.
	if (log_fp == NULL) { // Checks fopen result so truncation/open failures are reported immediately.
		perror("LOGGER: fopen() failed in clear_log"); // Reports failure to create fresh log so operator knows reset did not occur.
		return; // Exits because clear operation cannot proceed without writable stream.
	} // Closes open-failure branch for clear operation.
	now = time(NULL); // Calls time() to capture when log reset took place.
	if (now == (time_t)-1) { // Handles time() failure so reset still leaves an auditable header.
		fprintf(log_fp, "================ LOG RESET ================\n"); // Calls fprintf to write reset banner despite missing timestamp.
		fprintf(log_fp, "[TIME_UNAVAILABLE] Log cleared and reinitialized.\n"); // Calls fprintf to document reset without formatted time.
		fprintf(log_fp, "===========================================\n"); // Calls fprintf to close reset header framing.
		fclose(log_fp); // Calls fclose to commit fallback reset header and release stream.
		return; // Exits because normal timestamp formatting cannot continue.
	} // Closes time() failure branch.
	local_time_info = localtime(&now); // Calls localtime to convert reset epoch time into local calendar fields.
	if (local_time_info == NULL || strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", local_time_info) == 0U) { // Calls strftime to format reset timestamp and handles conversion/format failures in one branch.
		fprintf(log_fp, "================ LOG RESET ================\n"); // Calls fprintf to write reset banner even when formatted timestamp is unavailable.
		fprintf(log_fp, "[TIME_UNAVAILABLE] Log cleared and reinitialized.\n"); // Calls fprintf to keep reset action auditable without local timestamp text.
		fprintf(log_fp, "===========================================\n"); // Calls fprintf to close fallback reset header section.
		fclose(log_fp); // Calls fclose to flush fallback reset header and release file handle.
		return; // Exits because valid formatted timestamp was not produced.
	} // Closes localtime/strftime failure branch.
	fprintf(log_fp, "================ LOG RESET ================\n"); // Calls fprintf to print reset header banner at beginning of fresh file.
	fprintf(log_fp, "[%s] Log cleared and reinitialized.\n", timestamp); // Calls fprintf to record reset timestamp for audit traceability.
	fprintf(log_fp, "===========================================\n"); // Calls fprintf to close reset header block with consistent formatting.
	fclose(log_fp); // Calls fclose to flush reset header and release write stream.
} // Ends clear_log after truncating file and writing new header.
