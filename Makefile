CXX      ?= g++
CXXFLAGS = -std=c++17 -Wall -Wextra
SRCS     = main.cpp Graph.cpp LinkedList.cpp
OBJS     = $(SRCS:.cpp=.o)

ifeq ($(OS),Windows_NT)
EXE     = .exe
RUN     = ./KUETWasteX.exe
CLEAR   = cls
RM      = del /Q
else
EXE     =
RUN     = ./KUETWasteX
CLEAR   = clear
RM      = rm -f
endif

TARGET   = KUETWasteX$(EXE)
DATA     = wastex_data.txt

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) $(OBJS) -o $(TARGET)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

WasteX: $(TARGET)
	$(RUN)

reset:
	-$(RM) $(DATA)
	$(CLEAR)

clear:
	$(CLEAR)

clean:
	-$(RM) $(OBJS)
	-$(RM) $(TARGET)

.PHONY: all WasteX reset clear clean