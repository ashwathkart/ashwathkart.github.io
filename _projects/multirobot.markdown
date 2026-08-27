---
layout: post
title: Multirobot Warehouse Automation
permalink: /multirobot/
order:  2
image:  multirobot.gif
tags:   [Planning]
---
## Multi-Robot Path Planning for Warehouse Automation

Twelve robots share one warehouse floor. Each is handed a delivery — pick up at one
conveyor port, drop off at another — and each plans its own route with no idea what
the other eleven intend to do next. They all move at once, every tick. The interesting
problem is not finding a path; A\* does that in a millisecond. It is deciding, when
twelve independently-computed paths all want the same cell at the same instant, which
robots actually move.

<center><img src="/img/multirobot_run.gif" alt="multirobot warehouse simulation" width="700" loop="infinite"></center>
<br>

<center><a href="/demos/multirobot/" class="button read-more">▶ Watch a recorded run in your browser</a></center>
<br>

That demo is a real run, captured tick by tick and replayed in the browser — you can
pause it, scrub through it, and watch a specific standoff resolve frame by frame.

### The floor

The robot floor is a 60×12 open grid with no interior walls. Conveyor belts run the
length of both long edges, *outside* the grid, and robots can never drive onto them.
Each belt carries eight ports - pickup (blue) and dropoff (amber) - and a task targets
the floor cell directly in front of a port, where the robot parks and hands its load
across.

<center><img src="/img/warehouse_layout.png" alt="Warehouse Layout" width="700"></center>
<br>

Maps are plain text, which makes new layouts cheap to try:

```
S-------S-------D-------D     <- top belt (outside the grid, y == height)
............................  <- floor rows, y == height-1 down to 0
.....A.........B............  <- letters are robots, '#' a static wall
D-------D-------S-------S     <- bottom belt (y == -1)
```

Deliberately leaving the floor open matters. With walls, congestion is the map's
fault and you can tune it away by widening a corridor. On an empty floor, every
traffic jam the robots create is one they created themselves, which is the behaviour
we want to study and optimize.

### Dispatching work

A `FleetManagementSystem` holds a queue of (source, destination) pairs. When a slot
frees up, the next task goes to the idle robot with the lowest
`robot → source → destination` Manhattan cost. Ties break on the lowest robot id,
which keeps runs reproducible.

A task has two legs. First the robot drives to the pickup and then the FMS flips its phase, and then it
drives on to the dropoff before returning to the idle pool. Only ten tasks run at
once by default (these parameters are arguments that can be passed on the command line); the other robots stay parked — 
but a parked robot is still very much in the way, which turns out to be most of the difficulty.

### Planning

Two planners ship, behind a common interface:

- **A\*** with a Manhattan heuristic, which is admissible on a 4-connected grid.
- **Dijkstra**, which is the same search with the heuristic set to zero.

Each robot replans from scratch every tick against the obstacles it currently knows
about. That is wasteful, and it is the obvious thing to fix — but it means a robot
never follows a stale plan into a cell that became blocked two ticks ago.

Critically, the planner does **not** try to solve the multi-robot problem. It plans
one robot as if it were alone, and safety is somebody else's job.

### One tick

That somebody is the collision resolver. Each tick runs in three phases:

1. **Propose.** Every tasked robot plans and names the single cell it wants next.
2. **Resolve.** All proposals go into `resolve_moves`, which decides which are safe
   to perform *simultaneously*.
3. **Apply.** Cleared robots all move at once.

The resolver forbids exactly two things:

- **Vertex collisions** — two robots ending the tick in the same cell.
- **Swap collisions** — two neighbours trading cells. They would cross on the same
  edge, which is to say pass straight through one another.

And it deliberately *permits* two things that look alarming but aren't:

- **Following a leader** — robot A steps into the cell robot B is vacating this very
  tick. Nobody overlaps at any point.
- **Rotations** — three or more robots in a loop each advance one cell. No pair
  swaps, no cell is shared.

Banning those two would be the safe-looking choice, and it would deadlock every
corridor on the floor, because a queue of robots could never advance as a queue.

Cancelling a move can create a fresh conflict — a robot forced to stay put now blocks
the robot that was about to follow it — so cancellation iterates to a fixed point.
It terminates because moves only ever flip from on to off, never back. When robots
contend for a cell, a robot already standing on it keeps it; otherwise the lowest id
wins and the losers simply retry next tick.

### Parked robots and the yield cascade

Idle robots are the subtle case. Treating them as walls fragments an open floor into
dead ends; a robot parked in front of a port can wall off that port entirely.

So parked robots are routable-through. A mover plans straight through them, and only
when it actually arrives does it ask the squatter to step aside for a tick. If the
squatter is itself boxed in, it pushes whichever parked robot is beside it and follows
into the cell that one vacates — a convoy the resolver happily permits, since no pair
swaps and no cell is shared. The cascade is capped at four robots deep.

Two details stop this looping forever:

- The squatter prefers to step **off the mover's planned route** entirely. Without
  that, the pair shuffles politely down the aisle together indefinitely.
- Robots plan in id order, and each claims its target cell as it goes. That asymmetry
  is what stops two robots meeting head-on in a corridor from mirroring each other's
  dodge forever.

If nothing moves and no task progresses for 50 consecutive ticks, the fleet is
genuinely wedged and the run stops rather than spinning.

### Dynamic obstacles

Roughly 6% of open cells are blocked at any moment. Every three ticks each existing
obstacle has a 25% chance of clearing, and the floor is topped back up to target.

Obstacles never spawn on a port approach cell — nor on any of its four neighbours,
since a ring around one would seal that port off and wedge every remaining task that
needs it.

A robot does not get the obstacle list for free. It discovers an obstacle only when it
tries to step into the cell, then shares that discovery fleet-wide, so one robot
walking into a blockage reroutes everyone else. Within a run, fleet knowledge only
ever grows — nothing is forgotten once cleared, which is a real limitation.

### Results

Forty deliveries on the standard 60×12 floor, twelve robots, ten concurrent tasks,
averaged over five seeds. Every run completed all forty. Timings are pure compute,
with the display throttle off:

| Configuration | Ticks to finish | Compute time |
|---|---|---|
| A\*, obstacles on | 251.4 | 0.38 s |
| Dijkstra, obstacles on | 262.2 | 1.45 s |
| A\*, obstacles off | 273.0 | 0.42 s |
| Dijkstra, obstacles off | 278.0 | 1.64 s |

Two things stand out, one expected and one not.

The expected one: A\* and Dijkstra finish within about 4% of each other in *ticks*,
because on an open grid both return an optimal path, and the tick count is set by
congestion rather than by path length. The heuristic buys search effort, not route
quality — about 3.8× in compute. On a floor this size that is 1.4 seconds against 0.4,
so it is academic here; it would not be on a floor ten times larger replanned every
tick.

The unexpected one: **turning obstacles off makes the fleet slower.** 273 ticks
instead of 251. My understanding is that the direct route between two ports is the same lane
for every robot, so an unobstructed floor funnels the whole fleet into it and they
spend their time yielding to each other. Obstacles scatter robots onto parallel lanes
and break up the queue. I could not have predicted this, and it suggests the
one-step-lookahead resolver is leaving real throughput on the table — a planner with
some notion of congestion must capture that spreading deliberately, rather than
getting it by accident.

Worth noting: with obstacles off the runs are identical across all five seeds, which is
the reproducibility the id-based tie-breaking was there to provide. With obstacles on,
a fixed seed fixes the *sequence* of random draws but not the obstacle field each
planner sees, since different routes consume those draws differently — so the two
planners are not solving quite the same instance on a given seed. These are five-seed
averages, not a controlled A/B.

### Future Work

- **Incremental replanning.** A full A\* per robot per tick is the obvious waste.
  D\*-Lite or LPA\* would reuse the previous search tree instead of discarding it.
- **Lookahead beyond one cell.** The resolver only ever sees one step. A windowed
  reservation table would let robots negotiate a few ticks ahead and pre-empt the
  standoffs that currently resolve by retry.
- **Forgetting obstacles.** `fleet_known_obstacles` only grows within a run, so the
  fleet keeps routing around blockages that cleared long ago.
- **Congestion-aware dispatch.** Assignment is pure Manhattan distance and ignores
  that ten robots may already be headed down the same lane — which the obstacle result
  above suggests is costing real throughput.

Code, map format and CLI are in the [github repo](https://github.com/ashwathkart/multirobot-warehouse.git).
The run on the demo page was produced with:

```bash
python main.py --map map1.txt --planner astar --tasks 20 --seed 7 --record run.json
```
