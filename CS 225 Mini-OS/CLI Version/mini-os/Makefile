# /*
#  * Filename: Makefile
#  * Purpose: Builds and runs the mini-os executable with convenience targets for cleaning and execution.
#  * Author: 
#  * Date: 2026-04-
#  */

CC = gcc
CFLAGS = -Wall -Wextra -g -fcommon
LDFLAGS = -lrt -lpthread
TARGET = mini-os
SRC_DIR = src

SOURCES = $(wildcard $(SRC_DIR)/*.c)

OBJECTS = $(SOURCES:.c=.o)

# Builds all C source files into object files and links them into the mini-os executable.
all: $(TARGET)

# Links all compiled object files into the final mini-os binary with POSIX IPC libraries.
$(TARGET): $(OBJECTS)
	$(CC) $(CFLAGS) $(OBJECTS) -o $(TARGET) $(LDFLAGS)

# Compiles each C source file under src/ into its matching object file.
$(SRC_DIR)/%.o: $(SRC_DIR)/%.c
	$(CC) $(CFLAGS) -c $< -o $@

# Compiles the project and immediately runs the mini-os executable for quick testing.
run: $(TARGET)
	./$(TARGET)

# Removes all generated object files, the mini-os binary, and the runtime log file.
clean:
	rm -f $(OBJECTS) $(TARGET) serc_log.txt

.PHONY: all run clean
