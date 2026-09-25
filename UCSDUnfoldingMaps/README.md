# UCSD Unfolding Maps

This project is a Java and Processing starter application for the UC San Diego Coursera object-oriented programming coursework. It includes an offline Unfolding Maps demo, airport and route visualizations, earthquake mapping exercises, data parsing examples, and other module assignments built around interactive map markers.

The applications use local map tiles and data files where available, with examples such as `AirportMap` loading airport and route data, placing markers, and drawing connected routes on an interactive map.

## Diagrams

### Map Overview
![Map Overview](./Project%20Visuals/diagram_1.png)

### Map Workflow
![Map Workflow](./Project%20Visuals/diagram_2.png)

### Entity Relationship Diagram
![Entity Relationship Diagram](./Project%20Visuals/diagram_3_ERD.png)

## Installation

Import this folder into Eclipse as an existing project. If that does not work, create a Java project, copy the source files into it, add all `lib/*.jar` files to the build path, set the native library location for `jogl.jar`, and add `data/` as a source folder.

## Troubleshooting

Switch the Java compiler to 1.6 if you encounter VM problems. Processing should work with Java 1.6 and 1.7.