/*
 * Filename: logger.h
 * Purpose: Declares file-based logging levels and logging APIs for the Smart Emergency Response Center simulation.
 * Author: 
 * Date: 2026-04-
 */
#ifndef LOGGER_H // Starts include guard so logger declarations are processed only once per translation unit.
#define LOGGER_H // Defines include-guard token to prevent duplicate declaration errors.

#include "scheduler.h" // Imports ScheduleResult type so scheduling metrics can be logged through typed API parameters.

#define LOG_FILE "serc_log.txt" // Defines the log filename used to persist all emergency-center audit entries.

typedef enum { // Declares severity levels so each log entry is tagged by operational criticality.
	SERC_LOG_INFO, // Represents routine informational events that describe normal system behavior.
	SERC_LOG_WARNING, // Represents warning events that indicate potential issues requiring operator attention.
	SERC_LOG_CRITICAL // Represents critical events that may impact safety, dispatch continuity, or incident response.
} LogLevel; // Names this severity enumeration as LogLevel for logger API use.

void init_log(void); // Declares logger initialization that appends a new session header with timestamp.
void log_event(LogLevel level, char *message); // Declares generic event logger that writes timestamped severity-tagged messages.
void log_schedule_result(ScheduleResult r); // Declares scheduler-metric logger for recording algorithm performance results.
void log_memory_state(void); // Declares memory snapshot logger that records current memory map state.
void display_log(void); // Declares console display helper that prints the full log file contents.
void clear_log(void); // Declares log reset routine that overwrites the file and writes a fresh header.

#endif // LOGGER_H // Ends include guard after all logger declarations are provided.
