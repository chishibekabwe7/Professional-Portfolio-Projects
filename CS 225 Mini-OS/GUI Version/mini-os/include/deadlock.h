/*
 * Filename: deadlock.h
 * Purpose: Declares Banker's Algorithm resource matrices and deadlock-avoidance function contracts.
 * Author: 
 * Date: 2026-04-
 */
#ifndef DEADLOCK_H // Starts include guard so deadlock declarations are processed only once per translation unit.
#define DEADLOCK_H // Defines include-guard token to prevent duplicate symbol declarations.

#include "process.h" // Imports MAX_PROCESSES so Banker matrices stay aligned with process management limits.

#define NUM_RESOURCES 4 // Defines four resource classes: radio channels, ambulances, fire trucks, and police cars.

extern int allocation[MAX_PROCESSES][NUM_RESOURCES]; // Declares current allocation matrix showing resources each process currently holds.
extern int maximum[MAX_PROCESSES][NUM_RESOURCES]; // Declares maximum-claim matrix showing peak resources each process may request.
extern int available[NUM_RESOURCES]; // Declares availability vector showing how many units of each resource are currently free.
extern int need[MAX_PROCESSES][NUM_RESOURCES]; // Declares remaining-need matrix computed as maximum minus allocation for each process/resource pair.

void init_resources(void); // Declares setup routine that seeds sample availability and collects allocation/maximum input from the user.
void calculate_need(void); // Declares matrix update routine that recomputes need[i][j] as maximum[i][j] minus allocation[i][j].
int is_safe_state(void); // Declares Banker's safety check that returns 1 for safe state and 0 for unsafe state.
int request_resources(int pid, int request[]); // Declares resource-request handler that grants only if tentative allocation remains safe.
void display_resource_table(void); // Declares reporting routine that prints allocation, maximum, need, and available resources in table form.
int detect_deadlock(void); // Declares deadlock-detection helper that returns 1 if any process is permanently blocked, else 0.

#endif // DEADLOCK_H // Ends include guard after all deadlock declarations are provided.
