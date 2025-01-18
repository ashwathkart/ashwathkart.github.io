---
layout: post
title:  SLAM in ROS-Gazebo
permalink: /gazebo-slam/
date:   2000-01-05
image:  slam.png
tags:   [SLAM]
---
## Implementation of SLAM on TurtleBot3 Waffle in ROS-Gazebo

<center><img src="/img/slam.png" alt="SLAM" height="400" width="400"></center>
<br>

Simultaneous Localization and Mapping (SLAM) is a critical technology in robotics that enables autonomous robots to build a map of an unknown environment while simultaneously determining their position within that map. This dual capability is essential for applications such as autonomous vehicles, drones, and robotic vacuum cleaners, where precise navigation and obstacle avoidance are crucial. By using various sensors and algorithms, SLAM helps robots perceive their surroundings and navigate effectively, even in dynamic or unstructured environments. This project explores a simple implementation of SLAM techniques on a TurtleBot3 robot in a Gazebo environment.

This project is the result of what I learned from an [online course](https://www.udemy.com/course/ros-navigation/) I took, which was a solid introduction to ROS-Gazebo, mobile robotics, and most importantly, SLAM algorithms. ROS has an infamously steep learning curve, but this course simplifies the process and guides you through the setup, installation, and a quick implementation of a simple project. I recommend it to anyone starting out in robotics and ROS.

As can be seen in the name, Simultaneous Localization and Mapping is a combination of two tasks performed at once. Localization is the process by which a robot determines its position within an environment, often relative to a known location. Mapping, on the other hand, involves the creation of a map of the environment itself. The inherent challenge in SLAM is that effective mapping requires accurate localization, and accurate localization depends on a detailed map. This interdependency creates a complex chicken-and-egg problem, as each task requires the other to be completed successfully. SLAM algorithms are designed to solve this dilemma by updating the map and the robot's position simultaneously, using data from sensors and previously generated maps.

### Installing TurtleBot3 library

The first step in validating our implementation is to develop an environment to test it. Robotis provides a comprehensive guide to install their TurtleBot3 (TB3) library on their [e-manual](https://emanual.robotis.com/docs/en/platform/turtlebot3/simulation/). The TB3 library allows for simulation in Gazebo as well as real-world operation; it is a powerful tool to use to quickly get your mobile robotics project to roll-out, without having to worry about a lot of the details of planning, control or odometry. Setting up the simulation environment is as simple as downloading the packages, but hooking up the physical rig to do the same is slightly more involved.

Following the instructions in the e-manual, we download all the packages required and subsequently run `catkin_make` in the root directory to create a catkin workspace. We now have all the packages required for the project. If you are new to ROS, please refer to the official [ROS documentation.](https://wiki.ros.org/ROS/Tutorials)

After installation, we run the simulation script, which is also given in the e-manual. We also run the teleoperation command, showing us that in fact, everything works as it is supposed to.

### Map Generation

Let's now build a map that we can use as a starting point for navigation. This is known as Offline SLAM, where the robot explores its environment before the actual navigation task, allowing it to gather information about its surroundings. Offline SLAM has advantages over Online SLAM, where the robot builds the map from scratch while simultaneously navigating. Offline SLAM can lead to more reliable navigation because the robot has prior knowledge of the environment, reducing the computational load during navigation.

For this task, we use the `gmapping` package, a widely-used ROS package for SLAM. Gmapping uses laser range data and odometry information to create a 2D occupancy grid map of the environment. To start the mapping process, we launch the gmapping node:

#
    roslaunch turtlebot3_slam turtlebot3_slam.launch slam_methods:=gmapping

While the gmapping node is running, we control the robot using the teleoperation node to manually drive it around the environment:

#
    roslaunch turtlebot3_teleop turtlebot3_teleop_key.launch

As the robot moves, the gmapping package processes the laser scan data and updates the map in real-time. Once we have sufficiently explored the environment, we save the generated map:

#
    rosrun map_server map_saver -f ~/map

The map is now saved and can be used for navigation tasks.

### Map Navigation

Once the map of the environment is generated and stored, it can now be used for navigation. The `move_base` package handles navigation by combining the map with sensor data to plan and execute paths. The move_base node uses the Adaptive Monte Carlo Localization (AMCL) algorithm for localization, which continuously updates the robot's position based on sensor data and the pre-built map.

To launch the navigation stack, we start the AMCL and move_base nodes:

#
    roslaunch turtlebot3_navigation turtlebot3_navigation.launch map_file:=$HOME/map.yaml

With the navigation stack running, the robot can receive navigation goals and plan paths to reach them. We can set navigation goals using RViz, a visualization tool in ROS. In RViz, we load the map and set the initial pose of the robot using the `2D Pose Estimate` tool. Then, we set navigation goals using the `2D Nav Goal` tool.

As the robot navigates, the move_base node continuously plans the path, avoiding obstacles and dynamically adjusting to changes in the environment. This ensures that the robot reaches its destination safely and efficiently.

### Conclusion

Implementing SLAM on a TurtleBot3 Waffle in a ROS-Gazebo environment demonstrates the powerful capabilities of ROS for autonomous navigation. By using the gmapping package for mapping and the move_base package for navigation, we achieve a robust SLAM implementation that allows the robot to explore and navigate an environment autonomously. This project not only highlights the importance of SLAM in robotics but also provides a practical example of how to set up and run SLAM algorithms in a simulated environment.

For anyone starting in robotics and ROS, following this guide will help you understand the fundamental concepts and practical steps involved in implementing SLAM on a mobile robot. The resources mentioned, including the TurtleBot3 e-manual and the online course, provide excellent starting points for further exploration and learning in the field of autonomous robotics.

Follow [this link](https://github.com/ashwathkart/ros-slam-gazebo.git) to the github repo containing the source code.