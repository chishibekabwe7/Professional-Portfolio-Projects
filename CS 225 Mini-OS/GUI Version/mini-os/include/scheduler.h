/*
 * Filename: scheduler.h
 * Purpose: Defines scheduler algorithms, result metrics, and scheduler function prototypes.
 * Author: 
 * Date: 2026-04-
 */
#ifndef SCHEDULER_H // Starts the include guard so this header is compiled only once per translation unit.
#define SCHEDULER_H // Defines the include-guard token to prevent duplicate declarations.
typedef enum { // Declares the list of scheduling algorithms supported by the mini-os CPU scheduler.
	FCFS, // Represents First-Come, First-Served scheduling, where earlier arrivals run first.
	SJF, // Represents Shortest Job First scheduling, where smallest burst-time jobs run first.
	PRIORITY_SCHED, // Represents priority scheduling, where higher-priority emergency tasks run first.
	ROUND_ROBIN // Represents Round Robin scheduling, where each process receives a fixed time slice.
} SchedulingAlgorithm; // Names this algorithm-selection enum as SchedulingAlgorithm for scheduler control flow.
typedef struct { // Declares a structure that groups core performance metrics from a scheduling run.
	float avg_waiting_time; // Stores the mean waiting time across all scheduled processes.
	float avg_turnaround_time; // Stores the mean turnaround time from arrival to completion for all processes.
	float cpu_utilization; // Stores the CPU utilization percentage achieved during the scheduling simulation.
} ScheduleResult; // Names this metrics container type as ScheduleResult for function return values.
ScheduleResult run_fcfs(void); // Declares FCFS scheduler execution and returns computed scheduling metrics.
ScheduleResult run_sjf(void); // Declares SJF scheduler execution and returns computed scheduling metrics.
ScheduleResult run_priority(void); // Declares priority-based scheduler execution and returns computed metrics.
ScheduleResult run_round_robin(int quantum); // Declares Round Robin scheduler execution using a caller-provided time quantum.
void display_schedule_metrics(ScheduleResult result); // Declares a helper that prints aggregated scheduler metrics in readable form.
void print_gantt_chart(void); // Declares a helper that prints a Gantt chart to visualize execution order over time.
#endif // SCHEDULER_H // Ends the include guard after all scheduler declarations are provided.
