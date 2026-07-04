# SERC Mini-OS — Smart Emergency Response Center

> A CS 225 Introduction to Operating Systems group project at The Copperbelt University that simulates a Smart Emergency Response Center (SERC). The mini-os blends core OS concepts like process management, scheduling, memory allocation, IPC, deadlock handling (Banker's Algorithm), and file logging, with a Raylib GUI dashboard for real-time visualization.

![Language](https://img.shields.io/badge/Language-C-blue)
![Platform](https://img.shields.io/badge/Platform-Linux%2FWSL-success)
![GUI](https://img.shields.io/badge/GUI-Raylib-6f42c1)
![Status](https://img.shields.io/badge/Status-In%20Development-yellow)

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Group Members](#group-members)
- [Lecturer](#lecturer)
- [License](#license)

## Features
- ✅ Process Management
- ✅ CPU Scheduling
- ✅ Memory Management
- ✅ IPC
- ✅ Deadlock Handling (Banker's Algorithm)
- ✅ File Logging
- ⭐ Bonus: Raylib GUI Dashboard

## Project Structure
```
mini-os/
  include/
    deadlock.h     - Banker's Algorithm data and deadlock detection APIs
    gui.h          - Raylib dashboard definitions, colors, and UI state
    ipc.h          - IPC demo APIs for pipe and message queue workflows
    logger.h       - File logging levels and logging function prototypes
    memory.h       - Memory block model and allocation APIs
    process.h      - Process table model and process management APIs
    scheduler.h    - Scheduling algorithms and metrics definitions
  src/
    deadlock.c     - Banker's Algorithm implementation and deadlock checks
    gui.c          - Raylib GUI dashboard rendering and interaction logic
    ipc.c          - IPC demonstration routines
    logger.c       - File-based logging implementation
    main.c         - Console menu and system orchestration
    memory.c       - Memory allocation strategies and fragmentation tracking
    process.c      - Process creation, table display, and termination logic
    scheduler.c    - FCFS, SJF, Priority, and Round Robin schedulers
```

## Getting Started

### Prerequisites
- GCC
- Make
- Raylib
- WSL Ubuntu (or native Linux)

### Installation
```bash
sudo apt update
sudo apt install -y build-essential
```

```bash
sudo apt install -y libraylib-dev
```

### Compile
```bash
make clean && make
```

### Run
```bash
./mini-os
```

## Usage
The console menu drives the simulation:

- **1. Process Management** — Create, view, and terminate emergency tasks.
- **2. CPU Scheduling** — Run FCFS, SJF, Priority, and Round Robin.
- **3. Memory Management** — Allocate/free memory and view memory map.
- **4. IPC Demo** — Send and receive messages via pipe and message queue.
- **5. Deadlock Management** — Run Banker's safety check and detect deadlock.
- **6. File Log** — View and clear the system log.
- **7. Launch GUI Dashboard** — Open the Raylib visual dashboard.

To launch the GUI dashboard, choose **option 7** in the console menu.

## Group Members
| Name | Student ID | Role |
| --- | --- | --- |
| Gerah Nanyinza | 23140508 | - |
| Muyembe Kabole | 23133845 | - |
| Aggie Ndhlovu | 24156063 | - |
| Shadreck Kaulu | 24150592 | - |

## Lecturer
Dr. Derrick Ntalasha, Copperbelt University

## License
MIT