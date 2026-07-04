/*
 * Filename: ipc.c
 * Purpose: Implements POSIX pipe and message-queue IPC operations for Smart Emergency Response Center simulation.
 * Author: 
 * Date: 2026-04-
 */
#include <stdio.h> // Provides printf and perror so IPC operations can report results and system-call failures.
#include <string.h> // Provides strlen and memset so message lengths and queue attributes can be prepared safely.
#include <unistd.h> // Provides pipe, read, write, and close system calls used for pipe-based IPC.
#include <fcntl.h> // Provides O_CREAT and O_RDWR flags required when opening POSIX message queues.
#include <sys/stat.h> // Provides permission constants and types used by mq_open for queue creation modes.
#include <mqueue.h> // Provides POSIX mq_open, mq_send, mq_receive, mq_close, and mq_unlink APIs.
#include <errno.h> // Provides errno and ENOENT so queue cleanup can handle "already removed" conditions cleanly.
#include "../include/ipc.h" // Provides IPC function prototypes so implementation signatures stay consistent with the header.

#define QUEUE_NAME "/serc_queue" // Defines the required queue name so all queue operations target the same endpoint.
#define QUEUE_MAX_MESSAGES 10 // Defines queue depth so burst traffic can buffer several emergency updates.
#define QUEUE_MESSAGE_SIZE 256 // Defines maximum bytes per queued message so stack buffers can use compile-time sizing.
static mqd_t g_message_queue = (mqd_t)-1; // Stores opened queue descriptor so send/receive/cleanup functions share one handle.

void send_via_pipe(char *message) { // Implements single-message pipe loopback to simulate one unit reporting to central control.
	int pipe_fd[2] = {0, 0}; // Holds read and write file descriptors returned by the pipe system call.
	ssize_t bytes_written = 0; // Tracks write result so failures can be detected and reported.
	ssize_t bytes_read = 0; // Tracks read result so receive status and string termination can be handled safely.
	char read_buffer[QUEUE_MESSAGE_SIZE] = {0}; // Provides bounded storage for pipe readback before printing.
	if (message == NULL) { // Guards against null input so system calls are never given invalid memory pointers.
		printf("PIPE IPC: Cannot send a NULL message.\n"); // Explains validation failure so caller can retry with valid text.
		return; // Stops processing because null payload cannot be transmitted meaningfully.
	} // Closes null-guard branch after reporting invalid input.
	if (pipe(pipe_fd) == -1) { // Calls pipe() to create a unidirectional kernel buffer for parent-to-center style communication.
		perror("PIPE IPC: pipe() failed"); // Reports why pipe creation failed using the OS-provided error reason.
		return; // Exits because read/write descriptors do not exist when pipe() fails.
	} // Closes pipe-creation guard before write/read simulation continues.
	bytes_written = write(pipe_fd[1], message, strlen(message) + 1U); // Calls write() to place the message plus null terminator into the pipe.
	if (bytes_written == -1) { // Checks write result so transmission failures are caught immediately.
		perror("PIPE IPC: write() failed"); // Reports write() failure so IPC troubleshooting has direct syscall feedback.
		close(pipe_fd[1]); // Calls close() on write end to release kernel resources after failed transmission.
		close(pipe_fd[0]); // Calls close() on read end too so no descriptor leak remains on error path.
		return; // Stops further logic because nothing valid was written to read back.
	} // Closes write-failure branch after cleanup and early exit.
	if (close(pipe_fd[1]) == -1) { // Calls close() on write end to signal end-of-stream before attempting pipe readback.
		perror("PIPE IPC: close(write-end) failed"); // Reports close failure so descriptor management issues are visible.
		close(pipe_fd[0]); // Calls close() on read end as well to avoid leaking descriptors if this path fails.
		return; // Exits because stream finalization did not complete cleanly.
	} // Closes write-end close check after ensuring stream is finalized.
	bytes_read = read(pipe_fd[0], read_buffer, sizeof(read_buffer) - 1U); // Calls read() to retrieve the message from the pipe into bounded storage.
	if (bytes_read == -1) { // Checks read result so kernel-read failures are handled safely.
		perror("PIPE IPC: read() failed"); // Reports read() failure with OS context for debugging.
		close(pipe_fd[0]); // Calls close() on read end even on failure to release file descriptor resources.
		return; // Stops because message retrieval did not succeed.
	} // Closes read-failure branch after cleanup.
	read_buffer[sizeof(read_buffer) - 1U] = '\0'; // Forces final byte to null so printing remains safe even on boundary-sized reads.
	printf("PIPE IPC [Emergency Unit -> Center]: %s\n", read_buffer); // Prints looped-back payload to show simulated unit-center communication.
	if (close(pipe_fd[0]) == -1) { // Calls close() on read end because pipe descriptors are no longer needed after readback.
		perror("PIPE IPC: close(read-end) failed"); // Reports close failure to expose descriptor cleanup issues.
	} // Closes read-end close check while continuing normal function return.
} // Ends pipe IPC function after complete write/read/print lifecycle.

void init_message_queue(void) { // Creates and opens the named POSIX queue so dispatch messages can be exchanged asynchronously.
	struct mq_attr queue_attr; // Holds queue configuration values such as capacity and max message size.
	if (g_message_queue != (mqd_t)-1) { // Checks whether an older descriptor is still open from prior runs.
		mq_close(g_message_queue); // Calls mq_close() to release previous descriptor before reopening cleanly.
		g_message_queue = (mqd_t)-1; // Resets handle marker so state reflects "not currently open" before new open attempt.
	} // Closes pre-open cleanup branch after handling stale descriptor.
	mq_unlink(QUEUE_NAME); // Calls mq_unlink() preemptively so stale queue objects do not block fresh configuration.
	memset(&queue_attr, 0, sizeof(queue_attr)); // Clears attribute struct so all fields start from known deterministic values.
	queue_attr.mq_flags = 0; // Sets blocking mode so receive waits when queue is empty, matching simple demo behavior.
	queue_attr.mq_maxmsg = QUEUE_MAX_MESSAGES; // Sets queue depth so multiple emergency messages can be buffered.
	queue_attr.mq_msgsize = QUEUE_MESSAGE_SIZE; // Sets maximum message bytes so send/receive buffers align with queue constraints.
	queue_attr.mq_curmsgs = 0; // Initializes current-message counter field as required by mq_open attribute contract.
	g_message_queue = mq_open(QUEUE_NAME, O_CREAT | O_RDWR, 0644, &queue_attr); // Calls mq_open() to create/open "/serc_queue" with read-write access.
	if (g_message_queue == (mqd_t)-1) { // Checks mq_open result so queue creation/open errors are surfaced immediately.
		perror("MQ IPC: mq_open() failed"); // Reports mq_open() failure details to aid permissions/path troubleshooting.
		return; // Exits because queue operations cannot proceed without a valid descriptor.
	} // Closes open-failure branch after early exit path.
	printf("MQ IPC: Queue %s initialized successfully.\n", QUEUE_NAME); // Confirms initialization so operators know queue is ready.
} // Ends queue initialization after descriptor setup is complete.

void send_message(char *msg) { // Sends one emergency update into the POSIX queue for asynchronous center processing.
	size_t payload_size = 0U; // Tracks message size so mq_send receives an explicit bounded byte count.
	if (msg == NULL) { // Guards against null pointers so mq_send is never called with invalid data.
		printf("MQ IPC: Cannot send a NULL message.\n"); // Reports invalid input so caller can provide real message text.
		return; // Stops because there is no payload to enqueue.
	} // Closes null-message guard branch.
	if (g_message_queue == (mqd_t)-1) { // Verifies queue is initialized so send attempts do not target an invalid descriptor.
		printf("MQ IPC: Queue is not initialized. Call init_message_queue() first.\n"); // Instructs correct call order for using this API safely.
		return; // Exits because queue descriptor is unavailable.
	} // Closes descriptor-validation branch.
	payload_size = strlen(msg) + 1U; // Includes null terminator so received text is immediately printable as a C string.
	if (payload_size > (size_t)QUEUE_MESSAGE_SIZE) { // Validates payload length against configured queue message capacity.
		printf("MQ IPC: Message too large for queue (%zu bytes > %d bytes).\n", payload_size, QUEUE_MESSAGE_SIZE); // Explains rejection so caller can shorten the message.
		return; // Stops because mq_send would fail with EMSGSIZE for oversized payloads.
	} // Closes payload-size guard before system call.
	if (mq_send(g_message_queue, msg, payload_size, 0U) == -1) { // Calls mq_send() to enqueue message bytes onto "/serc_queue".
		perror("MQ IPC: mq_send() failed"); // Reports mq_send() failure to expose queue-full or permission issues.
		return; // Exits because message was not accepted by the queue.
	} // Closes send-failure branch after error handling.
	printf("MQ IPC [Sent]: %s\n", msg); // Prints confirmation so operators can trace each queued dispatch message.
} // Ends send_message after one enqueue attempt.

void receive_message(void) { // Receives and prints the next available queue message for center-side processing simulation.
	char receive_buffer[QUEUE_MESSAGE_SIZE] = {0}; // Allocates bounded receive storage sized to queue message limit.
	ssize_t received_bytes = 0; // Captures mq_receive result so success/failure and termination can be handled.
	if (g_message_queue == (mqd_t)-1) { // Verifies queue descriptor exists before attempting receive.
		printf("MQ IPC: Queue is not initialized. Call init_message_queue() first.\n"); // Guides caller to initialize queue before receiving.
		return; // Exits because mq_receive cannot run on invalid descriptor.
	} // Closes initialization-check branch.
	received_bytes = mq_receive(g_message_queue, receive_buffer, sizeof(receive_buffer), NULL); // Calls mq_receive() to fetch the next queued emergency message.
	if (received_bytes == -1) { // Checks syscall result so empty-queue or descriptor errors are reported.
		perror("MQ IPC: mq_receive() failed"); // Reports mq_receive() failure with errno context for diagnostics.
		return; // Exits because no valid message was retrieved.
	} // Closes receive-failure branch.
	if (received_bytes >= (ssize_t)sizeof(receive_buffer)) { // Guards against boundary case where payload may fill buffer entirely.
		receive_buffer[sizeof(receive_buffer) - 1U] = '\0'; // Forces null termination at buffer end so printing stays safe.
	} else { // Handles normal case where there is room to append a terminator after payload.
		receive_buffer[received_bytes] = '\0'; // Adds explicit terminator so output remains a valid C string.
	} // Closes termination-handling branch for received payload.
	printf("MQ IPC [Received]: %s\n", receive_buffer); // Prints received message to demonstrate queue-based delivery to center.
} // Ends receive_message after one dequeue-and-print cycle.

void close_message_queue(void) { // Closes descriptor and unlinks queue name so IPC resources are fully cleaned up.
	if (g_message_queue != (mqd_t)-1) { // Checks descriptor state so close is only attempted on valid open queues.
		if (mq_close(g_message_queue) == -1) { // Calls mq_close() to release this process handle to the message queue.
			perror("MQ IPC: mq_close() failed"); // Reports mq_close() errors so cleanup problems are visible.
		} // Closes mq_close error-check branch after attempted descriptor release.
		g_message_queue = (mqd_t)-1; // Resets global handle marker so later calls know queue is no longer open.
	} // Closes descriptor-cleanup branch.
	if (mq_unlink(QUEUE_NAME) == -1 && errno != ENOENT) { // Calls mq_unlink() to remove queue name unless it is already absent.
		perror("MQ IPC: mq_unlink() failed"); // Reports unlink failure when it is not the benign "no entry" case.
		return; // Exits early because queue name cleanup did not complete successfully.
	} // Closes mq_unlink error branch after handling serious failures.
	printf("MQ IPC: Queue %s closed and unlinked.\n", QUEUE_NAME); // Confirms cleanup so operators know queue resources were released.
} // Ends queue cleanup function after close/unlink lifecycle.

void demonstrate_ipc(void) { // Runs a labeled demo that exercises both pipe and message-queue communication paths.
	char pipe_message_one[] = "AMBULANCE -> CENTER: Critical patient pickup requested at Zone A."; // Defines first pipe sample to simulate ambulance alert.
	char pipe_message_two[] = "FIRE -> CENTER: Chemical fire detected at industrial block, requesting foam units."; // Defines second pipe sample to simulate fire response update.
	char pipe_message_three[] = "POLICE -> CENTER: Multi-vehicle collision secured, traffic diversion active."; // Defines third pipe sample to simulate police situational report.
	char queue_message_one[] = "QUEUE MSG 1: Dispatch ambulance support to trauma center entrance."; // Defines first queued sample to show asynchronous dispatch messaging.
	char queue_message_two[] = "QUEUE MSG 2: Send additional fire engine to Warehouse Sector 4."; // Defines second queued sample for firefighting reinforcement coordination.
	char queue_message_three[] = "QUEUE MSG 3: Police command requests drone feed at Central Junction."; // Defines third queued sample for law-enforcement command updates.
	printf("\n================ IPC DEMONSTRATION ================\n"); // Prints demo title so output sections are easy to identify.
	printf("\n--- Pipe-Based IPC Messages ---\n"); // Prints pipe section heading to separate communication modes.
	send_via_pipe(pipe_message_one); // Sends first sample via pipe to demonstrate point-to-point loopback exchange.
	send_via_pipe(pipe_message_two); // Sends second sample via pipe to show repeated independent pipe transactions.
	send_via_pipe(pipe_message_three); // Sends third sample via pipe to complete required three-message pipe demo.
	printf("\n--- POSIX Message Queue IPC Messages ---\n"); // Prints queue section heading so asynchronous operations are clearly grouped.
	init_message_queue(); // Initializes named queue before any send/receive operations occur.
	send_message(queue_message_one); // Enqueues first sample emergency message onto message queue.
	send_message(queue_message_two); // Enqueues second sample emergency message onto message queue.
	send_message(queue_message_three); // Enqueues third sample emergency message onto message queue.
	receive_message(); // Receives first queued message to show FIFO retrieval behavior.
	receive_message(); // Receives second queued message to continue queue consumption demonstration.
	receive_message(); // Receives third queued message to complete required three-message queue demo.
	close_message_queue(); // Closes and unlinks queue so demo leaves no persistent IPC object behind.
	printf("===================================================\n"); // Prints footer separator to indicate demo completion clearly.
} // Ends IPC demonstration after running all requested sample communications.
