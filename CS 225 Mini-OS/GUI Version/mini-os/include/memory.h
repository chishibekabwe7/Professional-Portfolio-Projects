/*
 * Filename: memory.h
 * Purpose: Defines memory block metadata, global memory map storage, and allocation API contracts.
 * Author: 
 * Date: 2026-04-
 */
#ifndef MEMORY_H // Starts the include guard so this header is parsed once per compilation unit.
#define MEMORY_H // Defines the include-guard token that prevents duplicate declarations.

#define TOTAL_MEMORY 512 // Sets total simulated RAM capacity to 512 MB for the mini-os.
#define MAX_BLOCKS 50 // Sets the maximum number of tracked memory blocks in the map.

typedef struct { // Declares the structure used to represent one contiguous memory block.
	int block_id; // Stores the unique identifier assigned to this memory block entry.
	int start_address; // Stores this block's starting address measured in MB units.
	int size; // Stores this block's size measured in MB units.
	int is_free; // Stores whether the block is available (1) or currently allocated (0).
	int allocated_to_pid; // Stores the owning process PID, or -1 when the block is free.
} MemoryBlock; // Names this memory-block metadata type as MemoryBlock.

MemoryBlock memory_map[MAX_BLOCKS]; // Defines the global memory map array with MAX_BLOCKS entries.

void init_memory(void); // Declares initialization logic that splits TOTAL_MEMORY into starting free blocks.
int first_fit(int pid, int size); // Declares first-fit allocation that returns a block_id on success or -1 on failure.
int best_fit(int pid, int size); // Declares best-fit allocation that returns a block_id on success or -1 on failure.
int worst_fit(int pid, int size); // Declares worst-fit allocation that returns a block_id on success or -1 on failure.
void free_memory(int pid); // Declares release logic that frees all memory blocks held by the specified process.
void display_memory_map(void); // Declares visualization logic that prints the current memory layout state.
int calculate_fragmentation(void); // Declares metric logic that returns total fragmented memory in MB.

#endif // MEMORY_H // Ends the include guard after all memory declarations are provided.
