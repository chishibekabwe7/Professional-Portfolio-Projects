/*
 * Filename: process.h
 * Purpose: Defines process management types, process table storage, and function prototypes.
 * Author: 
 * Date: 2026-04-
 */
#ifndef PROCESS_H // Starts the include guard to prevent duplicate header inclusion.
#define PROCESS_H // Defines the include guard symbol for this header.
#define MAX_PROCESSES 20 // Sets the maximum number of processes tracked in the process table.
typedef enum { // Enumerates valid lifecycle states for an operating-system process.
	NEW,        // The process has been created but has not yet entered the ready queue.
	READY,      // The process is ready to execute and waiting for CPU assignment.
	RUNNING,    // The process is actively executing instructions on the CPU.
	WAITING,    // The process is blocked while waiting for I/O or an external event.
	TERMINATED  // The process has completed execution or has been forcefully ended.
} ProcessState; // Names this process lifecycle enumeration as ProcessState.
typedef enum { // Enumerates emergency response unit categories for each process.
	AMBULANCE,  // Represents medical response operations and ambulance dispatch tasks.
	FIRE,       // Represents firefighting and rescue operations managed by fire services.
	POLICE      // Represents law-enforcement and security response operations.
} EmergencyType; // Names this emergency unit enumeration as EmergencyType.
typedef struct { // Declares the Process Control Block structure used by the mini-os.
	int pid;                 // Stores the unique process identifier.
	char name[50];           // Stores the process or task name with room for 49 chars plus null terminator.
	EmergencyType type;      // Stores which emergency unit category this process belongs to.
	ProcessState state;      // Stores the current lifecycle state of this process.
	int priority;            // Stores scheduling priority where 1 is low and 5 is critical.
	int arrival_time;        // Stores the timestamp when the process arrived in the system.
	int burst_time;          // Stores the total CPU time required by this process.
	int remaining_time;      // Stores remaining CPU time, especially for Round Robin scheduling.
	int waiting_time;        // Stores computed total waiting time after scheduling execution.
	int turnaround_time;     // Stores computed total turnaround time after scheduling execution.
	int memory_required;     // Stores required memory size in megabytes.
	int memory_start;        // Stores starting memory block index, or -1 when not allocated.
} PCB;                       // Names this Process Control Block type as PCB.
PCB process_table[MAX_PROCESSES]; // Defines the global process table array sized by MAX_PROCESSES.
void create_process(void); // Declares a function that creates and inserts a new process into the table.
void display_process_table(void); // Declares a function that prints all current process table entries.
void terminate_process(int pid); // Declares a function that terminates the process matching the provided PID.
PCB *get_process_by_pid(int pid); // Declares a function that returns a PCB pointer for a PID, or NULL if not found.
#endif // PROCESS_H // Ends the include guard for this header file.
