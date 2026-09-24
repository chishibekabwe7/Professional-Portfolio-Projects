/*
 * Filename: ipc.h
 * Purpose: Declares POSIX pipe and message-queue APIs for emergency center IPC simulation.
 * Author: 
 * Date: 2026-04-
 */
#ifndef IPC_H // Starts the include guard so declarations are only processed once per translation unit.
#define IPC_H // Defines the include-guard symbol that blocks duplicate prototype declarations.

void send_via_pipe(char *message); // Declares pipe-based IPC demo that writes and reads back one message.
void init_message_queue(void); // Declares initialization of the named POSIX message queue "/serc_queue".
void send_message(char *msg); // Declares message-queue send operation for emergency center communication.
void receive_message(void); // Declares message-queue receive operation that prints the next queued message.
void close_message_queue(void); // Declares cleanup routine that closes and unlinks the named message queue.
void demonstrate_ipc(void); // Declares end-to-end IPC demonstration using pipe and message-queue workflows.

#endif // IPC_H // Ends the include guard after all IPC declarations are provided.
