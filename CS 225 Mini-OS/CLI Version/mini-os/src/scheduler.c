/*
 * Filename: scheduler.c
 * Purpose: Implements FCFS and SJF scheduling simulations and returns aggregate scheduling metrics.
 * Author: 
 * Date: 2026-04-
 */
#include <stdio.h> // We include stdio so the scheduler can print Gantt charts and status messages.
#include "../include/scheduler.h" // We include scheduler declarations so definitions match declared return types.
#include "../include/process.h" // We include process definitions so the scheduler can access PCB fields and states.

static int collect_schedulable_processes(PCB *selected[], int limit) { // We gather only eligible processes so algorithms ignore blocked or finished tasks.
	int index = 0; // We use an index counter to scan every slot in the fixed-size process table.
	int selected_count = 0; // We track how many NEW or READY processes are available for scheduling.
	for (index = 0; index < MAX_PROCESSES; index++) { // We iterate across all table slots because entries are stored globally.
		if (process_table[index].pid > 0 && (process_table[index].state == NEW || process_table[index].state == READY)) { // We accept only initialized processes that are eligible to run now.
			if (selected_count < limit) { // We guard writes so we never overflow the temporary pointer array.
				selected[selected_count] = &process_table[index]; // We store a pointer so sorting does not destroy original table storage order.
				selected_count = selected_count + 1; // We increment the count so the next eligible process uses the next pointer slot.
			} // We close the capacity guard after conditionally inserting the pointer.
		} // We close eligibility filtering after handling this table entry.
	} // We finish scanning once every process-table slot has been checked.
	return selected_count; // We return the number of schedulable processes so callers can drive sorting and metrics safely.
} // We end collection helper after building the filtered scheduling list.

static void sort_selected_fcfs(PCB *selected[], int count) { // We isolate FCFS sorting so arrival-time ordering stays reusable and testable.
	int pass = 0; // We track bubble-sort passes because each pass moves one largest item toward the end.
	int pos = 0; // We track pair position so adjacent elements can be compared and swapped.
	for (pass = 0; pass < count - 1; pass++) { // We run enough passes to guarantee total ordering for all selected processes.
		for (pos = 0; pos < count - pass - 1; pos++) { // We compare adjacent pairs inside the unsorted suffix for this pass.
			if (selected[pos]->arrival_time > selected[pos + 1]->arrival_time || (selected[pos]->arrival_time == selected[pos + 1]->arrival_time && selected[pos]->pid > selected[pos + 1]->pid)) { // We order earlier arrivals first and break ties by PID for deterministic output.
				PCB *temp = selected[pos]; // We hold the left pointer temporarily so we can perform a safe swap.
				selected[pos] = selected[pos + 1]; // We move the right pointer left because it should execute earlier.
				selected[pos + 1] = temp; // We place the original left pointer to the right to complete the swap.
			} // We close comparison branch after optional swap.
		} // We close inner loop after all adjacent pairs in this pass are processed.
	} // We close outer loop when FCFS ordering is fully established.
} // We end FCFS sort helper so run_fcfs can focus on simulation steps.

static void sort_selected_sjf(PCB *selected[], int count) { // We isolate SJF sorting so shortest-burst ordering can be applied consistently.
	int pass = 0; // We count passes for bubble sort so repeated adjacency checks eventually fully sort the list.
	int pos = 0; // We track current adjacent-pair index for comparisons during each pass.
	for (pass = 0; pass < count - 1; pass++) { // We perform count-1 passes because that is sufficient for bubble-sort completion.
		for (pos = 0; pos < count - pass - 1; pos++) { // We compare neighboring entries that are still in the unsorted region.
			if (selected[pos]->burst_time > selected[pos + 1]->burst_time || (selected[pos]->burst_time == selected[pos + 1]->burst_time && selected[pos]->arrival_time > selected[pos + 1]->arrival_time) || (selected[pos]->burst_time == selected[pos + 1]->burst_time && selected[pos]->arrival_time == selected[pos + 1]->arrival_time && selected[pos]->pid > selected[pos + 1]->pid)) { // We prioritize shorter jobs, then earlier arrivals, then lower PID for stable deterministic order.
				PCB *temp = selected[pos]; // We store one pointer temporarily so swapping can occur without losing data.
				selected[pos] = selected[pos + 1]; // We move the preferred right-side entry into the earlier execution slot.
				selected[pos + 1] = temp; // We place the previous left entry behind it to complete ordering.
			} // We close SJF comparison branch after an optional swap.
		} // We finish this pass after checking all adjacent unsorted pairs.
	} // We finish all passes when SJF ordering is complete.
} // We end SJF sort helper to keep run_sjf logic concise.

static void sort_selected_priority(PCB *selected[], int count) { // We isolate priority sorting so critical emergency tasks can be ordered first.
	int pass = 0; // We count bubble-sort passes because repeated local swaps produce a globally sorted list.
	int pos = 0; // We track adjacent comparison position while scanning each unsorted pass.
	for (pass = 0; pass < count - 1; pass++) { // We perform enough passes to guarantee complete ordering.
		for (pos = 0; pos < count - pass - 1; pos++) { // We compare neighboring entries because bubble sort works through adjacent swaps.
			if (selected[pos]->priority < selected[pos + 1]->priority || (selected[pos]->priority == selected[pos + 1]->priority && selected[pos]->arrival_time > selected[pos + 1]->arrival_time) || (selected[pos]->priority == selected[pos + 1]->priority && selected[pos]->arrival_time == selected[pos + 1]->arrival_time && selected[pos]->pid > selected[pos + 1]->pid)) { // We rank higher numeric priority first and break ties by earlier arrival then lower PID.
				PCB *temp = selected[pos]; // We preserve the left pointer temporarily so swapping is safe.
				selected[pos] = selected[pos + 1]; // We move the better-ranked right item forward in execution order.
				selected[pos + 1] = temp; // We place the original left pointer after it to complete the swap.
			} // We close comparison branch after optional swap.
		} // We close inner pass scan after all adjacent pairs are checked.
	} // We close outer loop once the priority order is finalized.
} // We end priority sort helper so run_priority can focus on policy intent.

static ScheduleResult simulate_non_preemptive(PCB *selected[], int count, const char *label) { // We centralize non-preemptive execution so FCFS and SJF share one tested simulation path.
	ScheduleResult result = {0.0f, 0.0f, 0.0f}; // We initialize metrics to zero so empty schedules return safe default values.
	int current_time = 0; // We track simulated clock time to compute starts, finishes, and turnaround values.
	int first_start_time = -1; // We remember first execution time so utilization reflects actual scheduling window.
	int total_burst_time = 0; // We accumulate busy CPU time so utilization can be computed later.
	int total_waiting_time = 0; // We accumulate waiting times so average waiting can be calculated.
	int total_turnaround_time = 0; // We accumulate turnaround times so average turnaround can be calculated.
	int index = 0; // We use an index variable to iterate through sorted process pointers.
	if (count == 0) { // We guard against empty schedules so no divide-by-zero happens in metric formulas.
		printf("No NEW/READY processes available for %s scheduling.\n", label); // We notify the operator why no schedule was produced.
		return result; // We return zeroed metrics because no process execution occurred.
	} // We close empty-schedule guard after returning defaults.
	printf("\nGantt Chart (%s):\n", label); // We print a chart heading so users know which algorithm generated the timeline.
	printf("[ProcessName | start-end]\n"); // We print the chart format legend so segment text is easy to interpret.
	for (index = 0; index < count; index++) { // We execute each sorted process sequentially because FCFS and SJF are non-preemptive here.
		int start_time = 0; // We hold start time per process so waiting and chart output are computed clearly.
		int finish_time = 0; // We hold finish time per process so turnaround can be derived accurately.
		if (current_time < selected[index]->arrival_time) { // We account for CPU idle gaps when the next process has not arrived yet.
			current_time = selected[index]->arrival_time; // We fast-forward time to arrival because execution cannot start before process existence.
		} // We close idle-gap handling before recording actual start time.
		if (first_start_time < 0) { // We capture the first execution instant once so utilization window is anchored correctly.
			first_start_time = current_time; // We store initial start to represent when CPU first became active in this run.
		} // We close first-start capture after possible assignment.
		start_time = current_time; // We set process start equal to current clock since CPU begins executing it now.
		selected[index]->state = RUNNING; // We set RUNNING so process state reflects active CPU ownership during simulation.
		finish_time = start_time + selected[index]->burst_time; // We compute finish as start plus required CPU burst for non-preemptive execution.
		// Formula: turnaround_time = finish_time - arrival_time, because turnaround measures total elapsed time from process arrival to completion.
		selected[index]->turnaround_time = finish_time - selected[index]->arrival_time; // We store turnaround to capture complete lifecycle duration in the system.
		// Formula: waiting_time = turnaround_time - burst_time, because waiting is the non-executing portion of total turnaround.
		selected[index]->waiting_time = selected[index]->turnaround_time - selected[index]->burst_time; // We store waiting to quantify queue delay before CPU service.
		selected[index]->remaining_time = 0; // We mark remaining work as zero because non-preemptive execution completed the full burst.
		selected[index]->state = TERMINATED; // We set TERMINATED so downstream modules know this process finished execution.
		total_waiting_time = total_waiting_time + selected[index]->waiting_time; // We accumulate waiting to support average-waiting-time computation.
		total_turnaround_time = total_turnaround_time + selected[index]->turnaround_time; // We accumulate turnaround to support average-turnaround computation.
		total_burst_time = total_burst_time + selected[index]->burst_time; // We add burst to track total CPU busy time across scheduled processes.
		current_time = finish_time; // We advance simulation clock because CPU is now free only after this finish time.
		printf("[%s | %d-%d] ", selected[index]->name, start_time, finish_time); // We print one Gantt segment so execution order and time range are visible.
	} // We close process-execution loop after every selected process has been simulated.
	printf("\n"); // We end the Gantt output line so following logs appear on a fresh line.
	result.avg_waiting_time = (float)total_waiting_time / (float)count; // We compute mean waiting time so algorithm queue efficiency can be compared.
	result.avg_turnaround_time = (float)total_turnaround_time / (float)count; // We compute mean turnaround time so end-to-end responsiveness is measurable.
	if (current_time > first_start_time) { // We ensure positive elapsed window so utilization division is mathematically valid.
		// Formula: cpu_utilization = (total_burst_time / (last_finish_time - first_start_time)) * 100, because utilization is busy-time share of total schedule window.
		result.cpu_utilization = ((float)total_burst_time / (float)(current_time - first_start_time)) * 100.0f; // We convert busy-time ratio into a percentage for standard CPU utilization reporting.
	} else { // We handle degenerate timing windows to avoid division by zero.
		result.cpu_utilization = 0.0f; // We report zero utilization because no measurable execution interval exists.
	} // We close utilization computation branch after assigning a safe metric value.
	return result; // We return populated metrics so callers can display or log scheduler performance.
} // We end shared simulator helper after all non-preemptive metrics are computed.

ScheduleResult run_fcfs(void) { // We implement FCFS so tasks are scheduled by earliest arrival time.
	PCB *selected[MAX_PROCESSES] = {0}; // We allocate pointer slots to hold filtered schedulable processes.
	int count = 0; // We track how many eligible entries were collected for this run.
	count = collect_schedulable_processes(selected, MAX_PROCESSES); // We collect NEW/READY processes because only those states are allowed to be scheduled.
	sort_selected_fcfs(selected, count); // We sort by arrival time to satisfy FCFS ordering rules before simulation.
	return simulate_non_preemptive(selected, count, "FCFS"); // We simulate execution and return aggregated FCFS performance metrics.
} // We end FCFS entry point after returning the computed ScheduleResult.

ScheduleResult run_sjf(void) { // We implement SJF so tasks are scheduled by shortest required CPU burst.
	PCB *selected[MAX_PROCESSES] = {0}; // We allocate pointer slots to hold schedulable processes for burst-based sorting.
	int count = 0; // We track the number of NEW/READY processes selected for this SJF run.
	count = collect_schedulable_processes(selected, MAX_PROCESSES); // We filter to schedulable states because blocked/terminated tasks must not run.
	sort_selected_sjf(selected, count); // We sort by burst time to satisfy SJF behavior before executing processes.
	return simulate_non_preemptive(selected, count, "SJF"); // We run the common simulator and return SJF metrics.
} // We end SJF entry point after returning computed scheduling metrics.

ScheduleResult run_priority(void) { // We implement priority scheduling so urgent incidents are serviced ahead of low-risk work.
	PCB *selected[MAX_PROCESSES] = {0}; // We allocate pointer slots to hold processes eligible for this scheduling cycle.
	int count = 0; // We track how many NEW/READY entries were collected from the process table.
	/*
	 * Emergency response centers cannot treat all tasks equally when lives and infrastructure are at risk.
	 * Priority scheduling ensures critical incidents such as life-threatening medical calls or active fires run first.
	 * This policy reduces response latency for the most severe emergencies and improves safety outcomes.
	 */
	count = collect_schedulable_processes(selected, MAX_PROCESSES); // We collect only NEW/READY entries because those are valid runnable states.
	sort_selected_priority(selected, count); // We order by priority descending and arrival-time tie-breaker per emergency policy.
	return simulate_non_preemptive(selected, count, "PRIORITY"); // We reuse non-preemptive simulation to compute the same metrics as FCFS.
} // We end priority scheduler entry point after returning aggregate metrics.

ScheduleResult run_round_robin(int quantum) { // We implement Round Robin so runnable tasks share CPU fairly in fixed time slices.
	ScheduleResult result = {0.0f, 0.0f, 0.0f}; // We initialize result fields so invalid or empty runs return safe defaults.
	PCB *selected[MAX_PROCESSES] = {0}; // We store pointers to schedulable processes so we can queue by index instead of copying structs.
	int queue[MAX_PROCESSES] = {0}; // We allocate a circular queue of selected-index values to model ready-queue rotation.
	int head = 0; // We track queue front position so dequeue operations are O(1).
	int tail = 0; // We track queue back position so enqueue operations are O(1).
	int queue_size = 0; // We track active queue length so empty/full logic is explicit and safe.
	int count = 0; // We track number of NEW/READY processes participating in this Round Robin run.
	int next_to_arrive = 0; // We track next sorted process not yet inserted into the ready queue.
	int completed = 0; // We count completed processes so loop termination is deterministic.
	int current_time = 0; // We track simulated global clock used for arrivals, slices, and finish metrics.
	int first_start_time = -1; // We store first execution instant so CPU utilization window starts at first actual run.
	int total_exec_time = 0; // We accumulate CPU busy time from all executed time slices.
	int total_waiting_time = 0; // We accumulate waiting times to compute average waiting metric.
	int total_turnaround_time = 0; // We accumulate turnaround times to compute average turnaround metric.
	if (quantum <= 0) { // We validate quantum because zero or negative slices cannot drive a forward simulation.
		printf("Round Robin quantum must be greater than zero.\n"); // We explain invalid configuration so caller can provide a usable value.
		return result; // We exit early with default metrics because scheduling cannot proceed.
	} // We close quantum guard after either returning or accepting valid input.
	count = collect_schedulable_processes(selected, MAX_PROCESSES); // We select only NEW/READY tasks because other states are not runnable.
	if (count == 0) { // We handle empty runnable set so averages do not divide by zero.
		printf("No NEW/READY processes available for ROUND ROBIN scheduling.\n"); // We notify the operator why no timeline appears.
		return result; // We return defaults because no process could be dispatched.
	} // We close empty-set guard after returning or continuing.
	sort_selected_fcfs(selected, count); // We sort by arrival time so queue admission follows real task arrival order.
	for (next_to_arrive = 0; next_to_arrive < count; next_to_arrive++) { // We iterate through all selected processes to normalize RR-specific runtime fields.
		if (selected[next_to_arrive]->remaining_time <= 0) { // We repair stale remaining values so each process has executable time budget.
			selected[next_to_arrive]->remaining_time = selected[next_to_arrive]->burst_time; // We reset remaining time to full burst because unscheduled work equals burst demand.
		} // We close remaining-time normalization for this process.
		if (selected[next_to_arrive]->state == NEW) { // We transition NEW tasks toward readiness because RR queue operates on ready tasks.
			selected[next_to_arrive]->state = READY; // We mark as READY so state reflects eligibility before first dispatch.
		} // We close NEW-to-READY conversion for this process.
	} // We finish normalization after all selected processes are prepared for RR simulation.
	next_to_arrive = 0; // We reset arrival pointer so queue-loading logic starts from earliest sorted process.
	current_time = selected[0]->arrival_time; // We start at first arrival to avoid artificial pre-arrival execution.
	printf("\nGantt Chart (ROUND ROBIN, q=%d):\n", quantum); // We print chart title so operators know algorithm and quantum used.
	printf("[ProcessName | start-end]\n"); // We print chart legend so each time-slice segment is interpreted consistently.
	while (completed < count) { // We continue until every schedulable process has finished execution.
		while (next_to_arrive < count && selected[next_to_arrive]->arrival_time <= current_time) { // We enqueue all processes that have arrived by current clock time.
			queue[tail] = next_to_arrive; // We push arriving process index at queue tail to preserve FIFO fairness.
			tail = (tail + 1) % MAX_PROCESSES; // We advance tail circularly so queue storage wraps safely within array bounds.
			queue_size = queue_size + 1; // We increment queue size because one new process was admitted.
			next_to_arrive = next_to_arrive + 1; // We advance arrival pointer so each process is enqueued only once at arrival.
		} // We close arrival-enqueue loop after admitting all newly available processes.
		if (queue_size == 0) { // We detect empty ready queue to handle CPU idle periods between arrivals.
			if (next_to_arrive < count) { // We check for future arrivals so simulation can advance to next meaningful event.
				current_time = selected[next_to_arrive]->arrival_time; // We jump clock to next arrival because nothing can run before then.
				continue; // We restart loop so newly reached arrival time can enqueue the next process.
			} // We close future-arrival branch after time jump.
			break; // We stop if queue is empty and no arrivals remain because all useful work is complete.
		} // We close empty-queue handling before normal dequeue path.
		{ // We open a local scope so slice-specific temporary variables stay tightly limited to one dequeue cycle.
			int selected_index = queue[head]; // We read queue head index so we know which process gets the next time slice.
			PCB *current_process = selected[selected_index]; // We resolve PCB pointer because updates should apply directly to global process data.
			int start_time = current_time; // We record slice start so Gantt chart and finish metrics use exact timing.
			int run_time = quantum; // We default run length to full quantum because RR grants equal maximum slice lengths.
			head = (head + 1) % MAX_PROCESSES; // We advance head circularly because one process is being popped from the queue.
			queue_size = queue_size - 1; // We decrement size to reflect completed dequeue operation.
			if (first_start_time < 0) { // We capture first dispatch instant once so utilization denominator is accurate.
				first_start_time = start_time; // We store initial CPU service time as utilization window origin.
			} // We close first-start capture after possible assignment.
			if (current_process->remaining_time < run_time) { // We shorten slice for near-complete tasks to avoid executing past required work.
				run_time = current_process->remaining_time; // We cap runtime to remaining work because process should finish exactly at zero.
			} // We close runtime adjustment after ensuring slice length is valid.
			current_process->state = RUNNING; // We mark process as RUNNING so state reflects active CPU ownership during this slice.
			current_time = current_time + run_time; // We advance global clock by executed slice length to represent elapsed CPU time.
			current_process->remaining_time = current_process->remaining_time - run_time; // We subtract executed slice because that much work is now complete.
			total_exec_time = total_exec_time + run_time; // We add slice duration to busy-time accumulator for utilization metric.
			printf("[%s | %d-%d] ", current_process->name, start_time, current_time); // We print this slice segment so RR interleaving appears in the chart.
			while (next_to_arrive < count && selected[next_to_arrive]->arrival_time <= current_time) { // We enqueue processes that arrived while current slice was running.
				queue[tail] = next_to_arrive; // We push each new arrival to tail so they join the fair RR rotation.
				tail = (tail + 1) % MAX_PROCESSES; // We move tail circularly so queue insertion remains bounded and safe.
				queue_size = queue_size + 1; // We increment size for each newly enqueued arrival.
				next_to_arrive = next_to_arrive + 1; // We advance arrival pointer to avoid duplicate enqueue of the same process.
			} // We close post-slice arrival ingestion after all newly arrived tasks are queued.
			if (current_process->remaining_time > 0) { // We check incomplete status because unfinished tasks must return to ready queue.
				current_process->state = READY; // We revert state to READY so scheduler knows it can be dispatched again later.
				queue[tail] = selected_index; // We enqueue the same process at tail to continue RR fairness cycle.
				tail = (tail + 1) % MAX_PROCESSES; // We advance tail to maintain circular queue consistency after requeue.
				queue_size = queue_size + 1; // We increment size because one process was pushed back for future service.
			} else { // We enter completion branch when no CPU work remains for this process.
				int finish_time = current_time; // We capture finish time now because process completion occurs at slice end.
				// Formula: turnaround_time = finish_time - arrival_time, because turnaround is total elapsed time from arrival to completion.
				current_process->turnaround_time = finish_time - current_process->arrival_time; // We store turnaround for this process so response performance is measurable.
				// Formula: waiting_time = turnaround_time - burst_time, because waiting excludes actual CPU execution time.
				current_process->waiting_time = current_process->turnaround_time - current_process->burst_time; // We store waiting time to quantify queue delay.
				current_process->state = TERMINATED; // We mark process TERMINATED because its remaining work reached zero.
				total_waiting_time = total_waiting_time + current_process->waiting_time; // We accumulate waiting to compute average waiting across all completed tasks.
				total_turnaround_time = total_turnaround_time + current_process->turnaround_time; // We accumulate turnaround to compute average turnaround across all tasks.
				completed = completed + 1; // We increment completion count so loop can terminate once all processes finish.
			} // We close completion-vs-requeue decision after handling this slice outcome.
		} // We close local dequeue/slice block after fully processing one queue entry.
	} // We close RR simulation loop after every selected process has terminated.
	printf("\n"); // We end chart line so subsequent metrics output begins cleanly.
	result.avg_waiting_time = (float)total_waiting_time / (float)count; // We compute average waiting so fairness and delay can be evaluated quantitatively.
	result.avg_turnaround_time = (float)total_turnaround_time / (float)count; // We compute average turnaround so end-to-end completion latency is visible.
	if (first_start_time >= 0 && current_time > first_start_time) { // We validate denominator before utilization division to avoid undefined math.
		// Formula: cpu_utilization = (total_exec_time / (last_finish_time - first_start_time)) * 100, because utilization is busy fraction of active schedule span.
		result.cpu_utilization = ((float)total_exec_time / (float)(current_time - first_start_time)) * 100.0f; // We convert busy-time ratio to percent for standard CPU utilization reporting.
	} else { // We handle degenerate timing windows where utilization cannot be meaningfully computed.
		result.cpu_utilization = 0.0f; // We return zero utilization because no measurable execution interval was observed.
	} // We close utilization branch after assigning safe result value.
	return result; // We return aggregate Round Robin metrics so callers can display or log scheduler performance.
} // We end Round Robin implementation after queue simulation and metric computation.

void display_schedule_metrics(ScheduleResult result) { // We implement a formatted metrics printer so scheduler outcomes are easy to read and compare.
	printf("\n+-------------------------+-------------------+\n"); // We print top border so output appears as a clean summary table.
	printf("| Scheduling Metric       | Value             |\n"); // We print table header labels so each metric column is self-describing.
	printf("+-------------------------+-------------------+\n"); // We print header separator so labels are visually separated from data rows.
	printf("| Average Waiting Time    | %17.2f |\n", result.avg_waiting_time); // We print average waiting with fixed precision for clear algorithm comparison.
	printf("| Average Turnaround Time | %17.2f |\n", result.avg_turnaround_time); // We print average turnaround so end-to-end completion latency is visible.
	printf("| CPU Utilization (%%)     | %17.2f |\n", result.cpu_utilization); // We print CPU utilization percentage to show processor efficiency.
	printf("+-------------------------+-------------------+\n"); // We print bottom border so the summary closes in a neat table format.
} // We end summary-display helper after printing all required scheduling metrics.

void print_gantt_chart(void) { // We provide a basic implementation so the declared API is defined for future visualization extensions.
	printf("Gantt chart output is printed during algorithm execution in this module.\n"); // We clarify behavior so callers know charts appear inside run functions.
} // We end placeholder Gantt-chart API function.
