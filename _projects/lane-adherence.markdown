---
layout: post
title:  Lane Adherence of an Autonomous Car
permalink: /lane-fit/
order:  5
image:  lane_fit.png
tags:   [Autonomous Vehicles, Planning, Perception, Control]
---
## Implemented Lane Adherence in an Autonomous Vehicle.

<center><img src="/img/lane_fit.png" alt="Lane Fit" height="400" width="400"></center>
<br>

This project requires mainly three modules : Perception (camera feed), Planning (middle line generation), Control (vehicle velocity and steering wheel angle)

Perception : Take in live camera feed, apply perspective transform, detect left and right lanes.

Planning : Based on detected lanes, draw middle lane based on the pixel values, and generate waypoint from the pixel values.

Control : Control velocity to be at a set 5 mph speed, and control steering angle to maintain car on the planned path.

[github repo](https://github.com/ashwathkart/lane-adherence.git)
