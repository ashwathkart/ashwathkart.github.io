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

The system architecture consists of three tightly integrated modules that work in harmony to achieve autonomous parking: planning, control, and perception. As shown in the diagram below, each module handles a specific aspect of the parking task while maintaining continuous communication with the others.

<center><img src="/img/parking_diag.png" alt="Simple Function" width="700"></center>
<br>

Let's look into how each module works and how they come together to create a robust autonomous parking system.

### Path planning module

The path planning module implements a Hybrid A* algorithm to generate feasible trajectories between the vehicle's current position and the target parking spot. Unlike traditional A* which operates in discrete space, Hybrid A* algorithm explores the continuous configuration space while respecting vehicle constraints like turning radius and velocity limits.

The video below demonstrates the algorithm finding and executing an optimal path from the start position to a detected parking spot:

<iframe width="560" height="315" src="https://www.youtube.com/embed/q4q9yAApT8I" frameborder="1" allowfullscreen></iframe>
<br>

The planner takes as input:
- Current vehicle state: $(x_s, y_s, \theta_s)$ 
- Target parking spot: $(x_g, y_g, \theta_g)$
- Vehicle constraints:
  - Physical dimensions $(l, w)$
  - Minimum turning radius $R_{min}$
    - Maximum acceleration $a_{max}$ 
  - Maximum velocity $v_{max}$

The algorithm outputs a series of waypoints:

$$ W = \{(x_i, y_i, \theta_i, v_i)\}_{i=1}^n $$

Each waypoint tells the vehicle where to be, which direction to face, and how fast to move. Importantly, our planner also handles situations requiring three-point turns, much like a human driver would when the parking space is tight.

### Control module

The control system utilizes Model Predictive Control (MPC), which works by optimizing system inputs over a prediction horizon while respecting system constraints. In this case, the controller optimizes steering angle and velocity commands while ensuring the vehicle stays within its physical limits and avoids obstacles. The prediction horizon was set to 2 seconds, divided into 20 timesteps, allowing the controller to anticipate and smoothly execute complex maneuvers like three-point turns. The MPC formulation also incorporates soft constraints on acceleration and jerk to ensure passenger comfort during parking operations.

One of the key challenges addressed in the control system was handling the dynamic nature of parking. As the vehicle moves closer to the spot, its perception of the spot's exact location improves, leading to varying target positions. Rather than regenerating the entire path each time the target position updates, we implemented a blend function that smoothly interpolates between the previous and newly detected goal positions:

$$ goal_{new} = \alpha \cdot goal_{detected} + (1-\alpha) \cdot goal_{previous} $$

This blending approach allows the controller to gracefully handle updates to the target position while maintaining smooth and stable vehicle motion throughout the parking maneuver.

The video below illustrates how the controller adjusts the path in real-time to maintain smooth motion while following the planned trajectory as closely as possible, while also handling the dynamic nature of the target position, simulated in this case by a sine function randomly changing the target position.

<iframe width="560" height="315" src="https://www.youtube.com/embed/rcOIEILTj5I" frameborder="1" allowfullscreen></iframe>
<br>

The MPC controller takes the planned path and optimizes the vehicle's movements by minimizing a cost function:

$$\min_{u_t} \sum_{k=0}^{N} \left( \|x_k - x_{ref}\|_Q^2 + \|u_k\|_R^2 \right) $$

This mathematical expression essentially balances two goals:
1. Following the planned path as closely as possible
2. Making smooth, comfortable movements

The controller continuously outputs steering angles and velocity adjustments, similar to how a human driver would constantly adjust the steering wheel and pedals while parking.

### Perception Module

The perception module was developed simutaneously with the other modules, anticipating the time required for each submodule - training and filtering.

#### Training

To begin with, a YOLOv8 model was trained to detect parking spots in real-time video feeds. The training process involved:
1. Data collection :
  Collecting diverse parking lot images under various conditions, such as low lighting, varying angles of viewing the parking spot, and more importantly, various different types of parking spots.
2. Labelling :
  Carefully labeling empty parking spots using tools like Makesense.ai and Roboflow to generate label files containing bounding box annotations in (x, y, w, h, r) format, where (x,y) represents the center coordinates, (w,h) the dimensions, and r the rotation angle of each box
3. Training :
  The model was trained with the following dataset split:
  - Training set: 95%
  - Validation set: 4% 
  - Test set: 2%

  The YOLOv8 OBB model was trained with various hyperparameters:
  - Epochs: {50, 70, 80, 100}
  - Batch sizes: {5, 7, 10} 
  - Confidence threshold: 0.7

  The model achieved a mean Average Precision (mAP) of 92% and was validated on both single images and real-time video streams from recorded rosbag data. The video below shows the model's performance on a live camera feed containing a single viable parking spot.

  <iframe width="560" height="315" src="https://www.youtube.com/embed/M1g1zNkn9b8" frameborder="1" allowfullscreen></iframe>
  <br>

#### Filtering

The bounding boxes detected by YOLOv8 were used to crop relevant regions from the camera feed for detailed analysis. This cropping step helped focus processing on just the potential parking spots while reducing computational overhead.

For each cropped region, we applied the following filtering pipeline:

1. Gradient filtering to enhance line features:
   - Applied Sobel operators in both x and y directions
   - Combined the gradients to obtain edge magnitude
   - Enhanced contrast using histogram equalization

2. Threshold-based line detection:
   - Converted the gradient image to binary using adaptive thresholding
   - Pixels above the brightness threshold were classified as potential line segments
   - Connected components analysis helped identify continuous line segments

3. Parking spot boundary extraction:
   - Identified the two strongest parallel lines representing parking spot boundaries
   - Verified line parallelism within acceptable angular tolerance
   - Filtered out noise and irrelevant line segments

4. Reference line computation:
   - Calculated the perpendicular bisector between the boundary lines
   - Found the midpoint of this reference line
   - Computed the angle {\alpha} between the reference line and the y-axis

This filtered output, consisting of the reference point coordinates $(x, y)$ and orientation angle $\alpha$, was then passed to the planning module for path generation. The filtering process proved robust across various lighting conditions and parking spot configurations, with an average processing time of 50ms per frame.

<center><img src="/img/filtering.png" alt="Filtering Pipeline" width="700"></center>
<br>
The image above shows the stages of the filtering pipeline, from the raw image, (a), to the thresholded binary image , (b), to the final filtered output, (c).

### Frame transformation and module integration

Finally, the different modules were integrated together after testing them separately.

#### Transformation

Once a parking spot is detected, the perception module's output is transformed from camera coordinates to real-world Cartesian coordinates through an iterative calibration process. The mapping between pixel coordinates $(x_p, y_p)$ on the image plane and their corresponding 3D world coordinates $(x_c, y_c, z_c)$ was established through a series of successive refinements:

1. The intrinsic calibration was first performed using a checkerboard pattern, through which the camera's focal length, principal point, and lens distortion parameters were precisely determined, establishing the baseline intrinsic camera matrix.

2. The initial transformation was then refined through extrinsic calibration, where images of known 3D reference points were captured and analyzed, yielding the preliminary rotation and translation between the camera frame and world frame.

3. Further refinement was achieved through the Perspective-n-Point (PnP) algorithm, where the transformation matrix was iteratively optimized by minimizing the reprojection errors between the 2D image points and their corresponding 3D world coordinates.

Through these successive refinements, the final transformation equation was derived:

$$ \begin{bmatrix} x_c \\ y_c \\ z_c \\ 1 \end{bmatrix} = T_{ext} \cdot K^{-1} \begin{bmatrix} x_p \\ y_p \\ 1 \end{bmatrix} $$

where $K$ represents the optimized intrinsic camera matrix and $T_ext$ is the refined extrinsic transformation matrix. Through this meticulously calibrated system, detected parking spot boundaries are projected from image space to the vehicle's reference frame with projection errors consistently maintained below 0.5 ft.

#### Blend function

One of the most challenging problems was handling the dynamic nature of parking. As the vehicle moves closer to the spot, its perception of the spot's exact location improves, and thus the output value is different. A blend function was implemented to solve this problem by smoothly updating the target position without regenerating a path from scratch.

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