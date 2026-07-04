/*
 * Filename: memory.c
 * Purpose: Implements memory-map initialization, allocation strategies, release logic, visualization, and fragmentation metrics.
 * Author: 
 * Date: 2026-04-
 */
#include <stdio.h> // We include stdio so this module can print allocator status and memory-map visual output.
#include "../include/memory.h" // We include memory declarations so function definitions match the public API contract.

static int memory_block_count = 0; // We track active block entries so algorithms avoid scanning unused metadata slots.

static void refresh_block_ids(void) { // We centralize block-id refresh so IDs remain consistent after splits and shifts.
	int index = 0; // We keep an index counter to iterate across currently active memory blocks.
	for (index = 0; index < memory_block_count; index++) { // We visit only active entries because inactive slots are not part of the map.
		memory_map[index].block_id = index; // We assign sequential IDs so returned block references remain deterministic.
	} // We finish after all active blocks receive synchronized IDs.
} // We end this helper once identifier consistency is restored.

static int split_and_allocate_block(int block_index, int pid, int request_size) { // We isolate split logic so all fit strategies share one consistent allocation behavior.
	int original_start = memory_map[block_index].start_address; // We capture original start so split children can inherit correct address boundaries.
	int original_size = memory_map[block_index].size; // We capture original size so we can compute leftover free space accurately.
	if (original_size == request_size) { // We avoid unnecessary splitting when the free block already matches requested size exactly.
		memory_map[block_index].is_free = 0; // We mark block as allocated because the process now owns this memory region.
		memory_map[block_index].allocated_to_pid = pid; // We record owner PID so later release requests can find the block.
		return memory_map[block_index].block_id; // We return block ID immediately because allocation is complete without metadata edits.
	} // We close exact-fit branch after performing direct assignment.
	if (memory_block_count >= MAX_BLOCKS) { // We guard metadata capacity because splitting needs one extra descriptor slot.
		memory_map[block_index].is_free = 0; // We still allocate whole block so allocation can succeed despite descriptor pressure.
		memory_map[block_index].allocated_to_pid = pid; // We attach ownership so release operations still work correctly later.
		return memory_map[block_index].block_id; // We return allocated block ID because fallback whole-block assignment is done.
	} // We close capacity fallback branch before executing regular split path.
	{ // We open a local scope so temporary shift index remains limited to block-shuffling work.
		int shift = 0; // We define a shift index to move existing entries one step right and open a remainder slot.
		for (shift = memory_block_count; shift > block_index + 1; shift--) { // We shift from right to left so data is not overwritten during movement.
			memory_map[shift] = memory_map[shift - 1]; // We copy each entry rightward to create space for the new leftover free block.
		} // We finish shifting once index block_index+1 becomes available for remainder metadata.
	} // We close shift scope after metadata movement completes.
	memory_block_count = memory_block_count + 1; // We increase active block count because splitting creates one additional block descriptor.
	memory_map[block_index].start_address = original_start; // We keep allocated portion at original start to preserve address continuity.
	memory_map[block_index].size = request_size; // We resize front block to exactly the amount requested by this process.
	memory_map[block_index].is_free = 0; // We mark front block allocated because it now belongs to the requesting PID.
	memory_map[block_index].allocated_to_pid = pid; // We store owner PID so release by process can reclaim it later.
	memory_map[block_index + 1].start_address = original_start + request_size; // We start leftover block right after allocated region to avoid overlap.
	memory_map[block_index + 1].size = original_size - request_size; // We set remainder size to unallocated tail bytes from the original block.
	memory_map[block_index + 1].is_free = 1; // We mark the tail block free so future allocation strategies can reuse it.
	memory_map[block_index + 1].allocated_to_pid = -1; // We clear owner marker because leftover block is not owned by any process.
	refresh_block_ids(); // We refresh IDs because shifting and insertion changed block positions.
	return memory_map[block_index].block_id; // We return the allocated block identifier so caller can store allocation result.
} // We end split helper after converting one free block into allocated plus optional remainder.

static int compute_average_request_size(void) { // We estimate average request size from active allocations to evaluate small-hole fragmentation pressure.
	int index = 0; // We define an iterator for scanning active memory blocks.
	int request_count = 0; // We count allocated blocks because each represents one completed memory request.
	int total_requested = 0; // We sum allocated sizes so average request magnitude can be derived.
	for (index = 0; index < memory_block_count; index++) { // We inspect every active block because allocation history is reflected in used segments.
		if (memory_map[index].is_free == 0) { // We include only allocated blocks because free blocks are not process requests.
			total_requested = total_requested + memory_map[index].size; // We add this allocation size to the total request volume.
			request_count = request_count + 1; // We increment count so average denominator matches number of allocations.
		} // We close allocated-block branch before checking next entry.
	} // We finish scan after all active block entries are considered.
	if (request_count == 0) { // We guard division because no requests means average size is undefined.
		return 0; // We return zero to indicate no allocation baseline exists for fragmentation thresholding.
	} // We close no-request branch after safe early return.
	return total_requested / request_count; // We return integer average request size to use as the small-hole cutoff.
} // We end helper after deriving request baseline for fragmentation analysis.

void init_memory(void) { // We initialize memory map so simulation starts with predictable free regions.
	int index = 0; // We use an index to populate both initial free blocks and inactive trailing slots.
	int block_size = TOTAL_MEMORY / 8; // We compute equal initial block size because the requirement mandates eight equal blocks.
	int current_start = 0; // We track running start address so each new block begins where previous one ended.
	memory_block_count = 8; // We activate exactly eight initial descriptors because startup map has eight free partitions.
	for (index = 0; index < 8; index++) { // We populate the required eight startup free blocks.
		memory_map[index].block_id = index; // We assign a temporary sequential ID so each block can be referenced immediately.
		memory_map[index].start_address = current_start; // We set block start to current pointer so map covers memory contiguously.
		memory_map[index].size = block_size; // We assign equal block size to satisfy the initialization rule.
		memory_map[index].is_free = 1; // We mark startup blocks free because no process has allocated memory yet.
		memory_map[index].allocated_to_pid = -1; // We clear owner field because free blocks are not assigned to any PID.
		current_start = current_start + block_size; // We advance start pointer to next contiguous boundary for following block.
	} // We close initialization loop after all eight active blocks are defined.
	for (index = 8; index < MAX_BLOCKS; index++) { // We clear inactive metadata slots so stale values never appear in diagnostics.
		memory_map[index].block_id = index; // We still assign index-based ID so debug output remains consistent if slots activate later.
		memory_map[index].start_address = TOTAL_MEMORY; // We point inactive slots past valid range so they cannot be mistaken for real blocks.
		memory_map[index].size = 0; // We set zero size so inactive descriptors are naturally ignored by allocation scans.
		memory_map[index].is_free = 1; // We mark inactive entries free because they are not currently committed to allocations.
		memory_map[index].allocated_to_pid = -1; // We clear owner because inactive slots do not belong to any process.
	} // We close inactive-slot cleanup loop after remaining descriptors are reset.
	refresh_block_ids(); // We finalize IDs to guarantee consistent numbering after full reinitialization.
} // We end initialization after preparing deterministic free memory state.

int first_fit(int pid, int size) { // We implement first-fit so allocation stops at the first sufficient free block.
	int index = 0; // We define scan index because first-fit performs linear traversal from map start.
	/*
	 * First-fit is fast because it returns as soon as it finds any adequate free block, minimizing scan work.
	 * First-fit can increase external fragmentation because early splits leave small scattered holes near the front.
	 */
	if (size <= 0) { // We reject non-positive requests because allocating zero or negative MB is not meaningful.
		return -1; // We signal allocation failure so callers can handle invalid request sizes.
	} // We close input-validation branch before scanning blocks.
	for (index = 0; index < memory_block_count; index++) { // We scan left-to-right because first-fit policy selects earliest viable hole.
		if (memory_map[index].is_free == 1 && memory_map[index].size >= size) { // We accept the first free block that can satisfy requested size.
			return split_and_allocate_block(index, pid, size); // We allocate immediately to preserve first-fit semantics and minimize search time.
		} // We close fit-check branch before moving to the next block.
	} // We end scan if no free segment meets requested capacity.
	return -1; // We report failure because no block large enough exists under current map layout.
} // We end first-fit function after either successful allocation or exhaustion.

int best_fit(int pid, int size) { // We implement best-fit so chosen block wastes the least leftover space.
	int index = 0; // We define scan index because best-fit must inspect all candidates before deciding.
	int best_index = -1; // We store chosen block index so selection can be applied after full evaluation.
	int best_size = TOTAL_MEMORY + 1; // We track smallest suitable block size using a large initial sentinel.
	/*
	 * Best-fit reduces immediate wasted space by choosing the tightest block that still satisfies the request.
	 * Best-fit is slower than first-fit because it must scan all free blocks to prove which one is smallest.
	 */
	if (size <= 0) { // We reject invalid request sizes to keep allocator behavior mathematically consistent.
		return -1; // We return failure so caller can provide a valid positive allocation request.
	} // We close invalid-size guard before candidate search.
	for (index = 0; index < memory_block_count; index++) { // We examine every active block because best-fit requires global comparison.
		if (memory_map[index].is_free == 1 && memory_map[index].size >= size && memory_map[index].size < best_size) { // We keep candidate only if it fits and is tighter than current best.
			best_index = index; // We remember this block position as the current best-fit choice.
			best_size = memory_map[index].size; // We lower best-size threshold so later candidates must be even tighter.
		} // We close candidate-update branch before continuing full scan.
	} // We finish global scan after evaluating all possible free blocks.
	if (best_index < 0) { // We detect no-solution condition when no candidate ever passed fit checks.
		return -1; // We return failure because allocator cannot satisfy this request right now.
	} // We close no-candidate branch before applying selected block allocation.
	return split_and_allocate_block(best_index, pid, size); // We allocate from best candidate to minimize immediate internal waste.
} // We end best-fit function after selection and allocation.

int worst_fit(int pid, int size) { // We implement worst-fit so allocation uses the largest available hole.
	int index = 0; // We define scan index because worst-fit must inspect all candidates to find the largest.
	int worst_index = -1; // We store selected block index so we can allocate after full comparison.
	int worst_size = -1; // We track largest fitting size using a low sentinel so first candidate always wins initially.
	/*
	 * Worst-fit is sometimes used to leave larger leftover holes that may satisfy future medium requests.
	 * Worst-fit can still fragment memory, but it attempts to avoid producing very tiny unusable fragments early.
	 */
	if (size <= 0) { // We reject invalid request sizes because allocator semantics require positive memory demand.
		return -1; // We return failure so caller can retry with a valid request amount.
	} // We close invalid-size branch before scanning free blocks.
	for (index = 0; index < memory_block_count; index++) { // We inspect every block because largest-fitting selection needs global maximum.
		if (memory_map[index].is_free == 1 && memory_map[index].size >= size && memory_map[index].size > worst_size) { // We update candidate when a bigger fitting hole is found.
			worst_index = index; // We remember this block as current worst-fit target.
			worst_size = memory_map[index].size; // We raise threshold so later candidates must be even larger.
		} // We close candidate-update branch before continuing scan.
	} // We finish scanning after all active blocks are considered.
	if (worst_index < 0) { // We detect allocation impossibility when no fitting free block was found.
		return -1; // We report failure so caller can handle out-of-memory condition.
	} // We close no-candidate branch before performing split allocation.
	return split_and_allocate_block(worst_index, pid, size); // We allocate from largest hole to follow worst-fit policy.
} // We end worst-fit function after returning allocation outcome.

void free_memory(int pid) { // We implement per-process free so process termination can release owned memory safely.
	int index = 0; // We define scan index to inspect each active block for matching ownership.
	for (index = 0; index < memory_block_count; index++) { // We scan all active blocks because a process may own multiple split segments.
		if (memory_map[index].is_free == 0 && memory_map[index].allocated_to_pid == pid) { // We target only blocks currently allocated to specified process.
			memory_map[index].is_free = 1; // We mark block free so allocators can reuse this region for future requests.
			memory_map[index].allocated_to_pid = -1; // We clear ownership field so stale PID references do not remain.
		} // We close PID-match branch before checking next block.
	} // We finish scanning once every active block has been checked.
} // We end free function after releasing all blocks owned by requested PID.

void display_memory_map(void) { // We implement map display so operators can visually inspect allocation and free-space distribution.
	int index = 0; // We define scan index for printing each active block row.
	printf("\nMemory Map (Start, Size, Status):\n"); // We print a heading so table purpose is immediately clear.
	for (index = 0; index < memory_block_count; index++) { // We print one row per active block so split history remains visible.
		if (memory_map[index].is_free == 1) { // We branch on free state so status label reflects block ownership correctly.
			printf("Block %02d | Start: %3dMB | Size: %3dMB | [FREE]\n", memory_map[index].block_id, memory_map[index].start_address, memory_map[index].size); // We print free block metadata and requested [FREE] marker.
		} else { // We enter allocated branch to show which process currently owns this region.
			printf("Block %02d | Start: %3dMB | Size: %3dMB | [USED:%d]\n", memory_map[index].block_id, memory_map[index].start_address, memory_map[index].size, memory_map[index].allocated_to_pid); // We print allocated block metadata and requested [USED:pid] marker.
		} // We close status formatting branch after printing this block.
	} // We finish row loop after displaying all active blocks.
	printf("Visual Bar: "); // We print a compact bar label so following tokens are interpreted as contiguous map summary.
	for (index = 0; index < memory_block_count; index++) { // We iterate again to print concise status tokens in sequence.
		if (memory_map[index].is_free == 1) { // We print free token when block is available.
			printf("[FREE]"); // We append free marker to satisfy requested visual style.
		} else { // We print used token when block is allocated.
			printf("[USED:%d]", memory_map[index].allocated_to_pid); // We append owner-tagged used marker for quick ownership scanning.
		} // We close token-selection branch after writing this segment.
	} // We close compact bar loop after all blocks are represented.
	printf("\n"); // We terminate output line so future console messages start on a clean line.
} // We end display function after both detailed rows and compact bar are printed.

int calculate_fragmentation(void) { // We calculate external fragmentation estimate to show how much small free space is hard to use.
	int average_request_size = compute_average_request_size(); // We derive average request baseline because fragmentation is defined relative to typical request size.
	int index = 0; // We define scan index to inspect each active free block.
	int fragmented_total = 0; // We accumulate qualifying small-hole sizes into total fragmented memory metric.
	if (average_request_size <= 0) { // We guard against no-allocation history where average threshold would be meaningless.
		return 0; // We report zero fragmentation because there is no request profile to classify holes as too small.
	} // We close no-baseline guard before scanning free blocks.
	for (index = 0; index < memory_block_count; index++) { // We inspect all active blocks so every free fragment contributes when appropriate.
		if (memory_map[index].is_free == 1 && memory_map[index].size < average_request_size) { // We count only free holes smaller than average request as fragmented memory.
			fragmented_total = fragmented_total + memory_map[index].size; // We add this small hole size to total fragmentation estimate.
		} // We close qualification branch before checking next block.
	} // We finish scanning after evaluating every active block.
	return fragmented_total; // We return total fragmented MB so callers can monitor allocator health.
} // We end fragmentation function after producing final metric.
