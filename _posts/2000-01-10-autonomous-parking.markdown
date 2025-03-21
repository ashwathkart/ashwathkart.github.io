---
layout: post
title:  Autonomous Parking in a Self-Driving Car
permalink: /self-parking/
date:   2001-01-10
image:  parking.png
tags:   [Autonomous Vehicles, Perception, Planning, Control]
---
## Implementation of an Autonomous Parking Functionality in a Self-Driving Car

<iframe width="560" height="315" src="https://www.youtube.com/embed/xG1_ZaXZ-rI" frameborder="1" allowfullscreen></iframe>
<br>

Autonomous parking represents a crucial functionality in self-driving vehicles, combining elements of perception, planning, and control. This post details the development and implementation of an autonomous parking system that enables a fully fitted-out autonomous vehicle to detect empty parking spots and execute precise parking maneuvers. The challenge involved not just finding an empty spot, but also planning a feasible path to it, controlling the vehicle precisely along that path, and continuously updating the plan based on real-time perception data.

The project can be broadly split into the development of three major modules: planning, control, and perception. Let's look into how each module works and how they come together to create a robust autonomous parking system.

### Path planning module

The path planning module implements a Hybrid A* algorithm to generate feasible trajectories between the vehicle's current position and the target parking spot. Unlike traditional A* which operates in discrete space, Hybrid A* considers the vehicle's kinematic constraints while maintaining the computational efficiency of grid-based search.

The algorithm takes as input:
- Start state: $(x_s, y_s, \theta_s)$
- Goal state: $(x_g, y_g, \theta_g)$
- Vehicle parameters: 
  - Dimensions $(l, w)$
  - Minimum turn radius $R_{min}$
  - Maximum acceleration $a_{max}$
  - Maximum velocity $v_{max}$

The algorithm outputs a series of waypoints:

$$ W = \{(x_i, y_i, \theta_i, v_i)\}_{i=1}^n $$

Each waypoint tells the vehicle where to be, which direction to face, and how fast to move. Importantly, our planner also handles situations requiring three-point turns, much like a human driver would when the parking space is tight.

### Control module

The control system utilizes Model Predictive Control (MPC), which optimizes vehicle inputs over a prediction horizon while respecting system constraints. 

The MPC controller takes the planned path and optimizes the vehicle's movements by minimizing a cost function:

$$\min_{u_t} \sum_{k=0}^{N} \left( \|x_k - x_{ref}\|_Q^2 + \|u_k\|_R^2 \right) $$

This mathematical expression essentially balances two goals:
1. Following the planned path as closely as possible
2. Making smooth, comfortable movements

The controller continuously outputs steering angles and velocity adjustments, similar to how a human driver would constantly adjust the steering wheel and pedals while parking.

### Perception Module

Simultaneously, we developed the perception module.

To begin with, we trained a YOLOv8 model to detect parking spots in real-time video feeds. The training process involved:
1. Collecting diverse parking lot images under various conditions
2. Carefully labeling empty and occupied spots
3. Training the model to recognize not just the presence of spots, but their orientation as well

The model achieved the following performance metrics:
- 92% precision in detecting parking spots
- 87% recall rate
- 89% mean Average Precision at 0.5 IOU

Once a parking spot is detected, we transform its location from the camera's perspective to the vehicle's reference frame, also known as the Ego Frame. 

One of the most challenging aspects was handling the dynamic nature of parking. As the vehicle moves closer to the spot, its perception of the spot's exact location improves. We implemented a blend function to smoothly update the target position:

$$ goal_{new} = \alpha \cdot goal_{detected} + (1-\alpha) \cdot goal_{previous} $$

### Results

After extensive testing, validating and reconfiguring, our system achieved:
- Consistent parking completion in about 25 seconds
- Position accuracy within 1 ft of the ideal spot
- Orientation accuracy within 20 degrees
- 84% success rate across 50 different trials

### Conclusion

This project demonstrates the successful integration of modern robotics techniques for autonomous parking. The combination of Hybrid A* planning, MPC control, and deep learning-based perception creates a robust system capable of handling real-world parking scenarios.

Future improvements could include:
1. Implementation of particle filters for more robust state estimation
2. Integration of uncertainty-aware planning
3. Extension to more complex parking scenarios

The complete implementation and documentation can be found in the [GitHub repository](https://github.com/ashwathkart/GEMstack.git).