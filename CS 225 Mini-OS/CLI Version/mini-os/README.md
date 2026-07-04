# SERC Mini-OS

SERC Mini-OS is a teaching/demo mini operating-system simulation for a Smart Emergency Response Center. It combines process management, scheduling, memory allocation, IPC, deadlock avoidance, and logging into one interactive console app.

## Compile On WSL Ubuntu

### 1. Install build tools
```bash
sudo apt update
sudo apt install -y build-essential
```

### 2. Go to the project folder
```bash
cd "/home/cj/Github/My-Learning-Repository-2025-2026/Second Academic Year/CS 225 Mini-OS/mini-os"
```

### 3. Build the binary
```bash
make
```

This compiles all `.c` files under `src/` and links them into the `mini-os` executable.

## Run

### Option A: Build and run in one command
```bash
make run
```

### Option B: Run manually
```bash
./mini-os
```

## Implemented Features

- Interactive menu-driven console system (`do-while` menu loop)
- Process management:
  - Create emergency tasks (AMBULANCE, FIRE, POLICE)
  - View process table
  - Terminate process by PID
- CPU scheduling:
  - FCFS
  - SJF
  - Priority Scheduling
  - Round Robin (quantum input)
  - Metrics and text-based Gantt output
- Memory management:
  - Initialization with partitioned memory map
  - First Fit, Best Fit, Worst Fit allocation
  - Free memory by PID
  - Memory map visualization and fragmentation calculation
- IPC:
  - Pipe-based message send/readback
  - POSIX message queue (`mqueue`) send/receive
  - IPC demo workflow
- Deadlock management:
  - Banker's Algorithm data model (`allocation`, `maximum`, `available`, `need`)
  - Safety check (`is_safe_state`)
  - Resource request validation (`request_resources`)
  - Deadlock detection helper
- File logging:
  - Timestamped event logging with severity levels
  - Scheduling result logging
  - Memory snapshot logging
  - View/clear log
- Live presentation demo scenario:
  - Auto-creates 5 emergency processes
  - Auto-allocates memory
  - Runs Priority scheduling
  - Sends pipe IPC messages
  - Runs Banker's safety check
  - Prints full system log

## Chosen 4 OS Components And Why

The project includes several modules, but the 4 primary OS components chosen for core demonstration are:

1. Process Management
- Why: Emergency tasks (dispatch, response, coordination) are naturally modeled as processes with states, priorities, and execution metadata.

2. CPU Scheduling
- Why: Response systems must prioritize urgent incidents and fairly distribute CPU time across concurrent tasks.

3. Memory Management
- Why: Resource-constrained systems need clear allocation strategies and visibility into fragmentation behavior.

4. Inter-Process Communication (IPC)
- Why: Emergency units and the control center must exchange messages quickly and reliably for coordinated response.

Additional supporting components are also implemented:
- Deadlock avoidance/detection (Banker's Algorithm)
- Persistent file-based operational logging
