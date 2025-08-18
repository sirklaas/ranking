"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import "./planner.css";
// Using server routes for PocketBase access to avoid client-side rule issues

// Types
type DayIndex = 0 | 1 | 2 | 3 | 4 | 5; // 6 days
interface Task {
  id: string;
  title: string;
  body: string; // up to two lines
  day: DayIndex | null; // null means unplaced (tray)
  slot: number | null; // 0..7 or null for tray
  completed?: boolean;
}

// Constants
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const SLOTS = Array.from({ length: 8 }, (_, i) => i); // 8 slots, starting 09:00
const TOTAL_SLOTS = DAYS.length * SLOTS.length; // 48

// Helpers
const weekStartKey = (d = new Date()) => {
  // Week starts on Monday
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0=Mon
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const weekStartISO = (d = new Date()) => {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0=Mon
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const STORAGE_KEY = "planner.tasks.v1";
const WEEK_KEY = "planner.weekStart";
const OWNER_KEY = "planner.ownerId";
const WEEK_ID_KEY_PREFIX = "planner.weekId:"; // key = `${WEEK_ID_KEY_PREFIX}${ownerId}:${weekISO}`

function resolveOwnerId(): string {
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("owner");
    if (q) {
      localStorage.setItem(OWNER_KEY, q);
      return q;
    }
  } catch {}
  try {
    return localStorage.getItem(OWNER_KEY) || "klaas";
  } catch {
    return "klaas";
  }
}

function useGoogleFont(fontHref: string) {
  useEffect(() => {
    const id = "planner-font-link";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = fontHref;
      document.head.appendChild(link);
    }
  }, [fontHref]);
}

export default function PlannerPage() {
  // Load Barlow Semi Condensed 300
  useGoogleFont(
    "https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300&display=swap"
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [ownerId, setOwnerId] = useState<string>("klaas");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [redLineTop, setRedLineTop] = useState<number>(0);
  const [timeLabel, setTimeLabel] = useState<string>("");
  const firstSlotRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedHashRef = useRef<string | null>(null);
  const savingRef = useRef<boolean>(false);

  // Resolve owner and load from localStorage immediately
  useEffect(() => {
    try {
      const resolved = resolveOwnerId();
      setOwnerId(resolved);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsedRaw = JSON.parse(raw) as unknown;
        if (Array.isArray(parsedRaw)) {
          const parsed: Task[] = parsedRaw.map((t) => {
            const obj = t as Partial<Task> & Record<string, unknown>;
            return {
              id: typeof obj.id === "string" ? obj.id : crypto.randomUUID(),
              title: typeof obj.title === "string" ? obj.title : (typeof obj.text === "string" ? obj.text : ""),
              body: typeof obj.body === "string" ? obj.body : "",
              day: (typeof obj.day === "number" ? (obj.day as number) : null) as DayIndex | null,
              slot: (typeof obj.slot === "number" ? (obj.slot as number) : null),
              completed: Boolean(obj.completed),
            } as Task;
          });
          setTasks(parsed);
        } else {
          setTasks([{ id: crypto.randomUUID(), title: "", body: "", day: null, slot: null }]);
        }
      } else {
        // Start with a single empty block in tray
        setTasks([{ id: crypto.randomUUID(), title: "", body: "", day: null, slot: null }]);
      }
    } catch {
      setTasks([{ id: crypto.randomUUID(), title: "", body: "", day: null, slot: null }]);
    }
  }, []);

  // Helpers for cached week id
  const getWeekIdKey = (owner: string, iso: string) => `${WEEK_ID_KEY_PREFIX}${owner}:${iso}`;
  const writeCachedWeekId = useCallback((owner: string, iso: string, id: string) => {
    try { localStorage.setItem(getWeekIdKey(owner, iso), id); } catch {}
  }, []);

  // Load via server API (overrides localStorage if found)
  useEffect(() => {
    const abort: { canceled: boolean } = { canceled: false };
    (async () => {
      try {
        const wsISO = weekStartISO();
        const res = await fetch(`/api/weekplanner?owner=${encodeURIComponent(ownerId)}&weekStart=${encodeURIComponent(wsISO)}`, { cache: 'no-store' });
        const json = await res.json();
        const rec = json && typeof json === 'object' ? json as { id?: string | null; data?: unknown } : null;
        if (rec && rec.id) writeCachedWeekId(ownerId, wsISO, rec.id);
        if (abort.canceled) return;
        if (rec && rec.data && typeof rec.data === "object") {
          const payload = rec.data as unknown as { tasks?: unknown };
          if (Array.isArray(payload.tasks)) {
            const parsed: Task[] = (payload.tasks as unknown[]).map((t) => {
              const obj = t as Partial<Task> & Record<string, unknown>;
              return {
                id: typeof obj.id === "string" ? obj.id : crypto.randomUUID(),
                title: typeof obj.title === "string" ? obj.title : "",
                body: typeof obj.body === "string" ? obj.body : "",
                day: (typeof obj.day === "number" ? (obj.day as number) : null) as DayIndex | null,
                slot: (typeof obj.slot === "number" ? (obj.slot as number) : null),
                completed: Boolean(obj.completed),
              } as Task;
            });
            setTasks(parsed.length ? parsed : [{ id: crypto.randomUUID(), title: "", body: "", day: null, slot: null }]);
          }
        }
      } catch {
        // ignore; stay on local cache
      }
    })();
    return () => { abort.canceled = true; };
  }, [ownerId, writeCachedWeekId]);

  // Weekly rollover
  useEffect(() => {
    const currentWeek = weekStartKey();
    const storedWeek = localStorage.getItem(WEEK_KEY);
    if (!storedWeek) {
      localStorage.setItem(WEEK_KEY, currentWeek);
      return;
    }
    if (storedWeek !== currentWeek) {
      // Move unfinished tasks to Monday, keep slot
      setTasks((prev) => {
        const moved = prev
          .filter((t) => !t.completed && t.slot !== null)
          .map((t) => ({ ...t, day: 0 as DayIndex }));
        const tray = prev.filter((t) => t.slot === null && !t.completed);
        const next = [...moved, ...tray];
        localStorage.setItem(WEEK_KEY, currentWeek);
        return next.length > 0
          ? next
          : [{ id: crypto.randomUUID(), title: "", body: "", day: null, slot: null }];
      });
    }
  }, []);

  // Persist locally and upsert via server API (debounced, skip if unchanged)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {}

    const wsISO = weekStartISO();
    const payload = {
      meta: {
        weekStart: wsISO,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      tasks,
    };
    const hash = JSON.stringify({ ownerId, wsISO, tasks });

    // Cancel previous pending save
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // If nothing changed since last successful save, skip scheduling
    if (lastSavedHashRef.current === hash) {
      return;
    }

    // Debounce actual save
    saveTimerRef.current = window.setTimeout(async () => {
      if (savingRef.current) return; // avoid overlapping
      savingRef.current = true;
      try {
        const res = await fetch('/api/weekplanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId, weekStart: wsISO, data: payload })
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        const json = await res.json();
        if (json?.id) writeCachedWeekId(ownerId, wsISO, json.id as string);
        lastSavedHashRef.current = hash;
      } catch {
        // ignore; will retry on next change
      } finally {
        savingRef.current = false;
      }
    }, 1200);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [tasks, ownerId]);

  // Red line positioning (represents current time 09:00-17:00)
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const startH = 9; // 09:00
      const endH = 17; // exclusive upper bound (8 slots)
      const h = now.getHours() + now.getMinutes() / 60;
      const clamped = Math.max(startH, Math.min(endH, h));
      const hourIndex = clamped - startH; // 0..8
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      setTimeLabel(`[ ${hh}:${mm} ]`);

      const slotEl = firstSlotRef.current;
      if (!slotEl) return;
      const slotRect = slotEl.getBoundingClientRect();
      // Find computed gap from parent row by reading CSS variable or measuring offset between two stacked slots
      // Simplify: read computed style for --slot-h and --gap
      const root = document.documentElement;
      const slotHVar = getComputedStyle(root).getPropertyValue("--slot-h").trim();
      const gapVar = getComputedStyle(root).getPropertyValue("--gap").trim();
      const parsePx = (v: string) => (v.endsWith("px") ? parseFloat(v) : parseFloat(v));
      const slotH = parsePx(slotHVar || `${slotRect.height}px`);
      const gap = parsePx(gapVar || "10px");

      // Baseline: top of first slot row relative to its container
      const grid = slotEl.closest('.grid') as HTMLElement | null;
      if (!grid) return;
      const gridRect = grid.getBoundingClientRect();
      const baseline = slotRect.top - gridRect.top; // px from grid top to first slot top

      // We want the line BETWEEN hours so it never goes through a task.
      // Boundary index is between hour k and k+1. For 13:34, between 13 and 14.
      const boundary = Math.min(8, Math.max(0, Math.floor(hourIndex) + 1));
      const top = baseline + boundary * (slotH + gap) - gap / 2; // halfway inside the gap
      setRedLineTop(top);
    };
    compute();
    const id = setInterval(compute, 30000); // update every 30s
    return () => clearInterval(id);
  }, []);

  // Derived
  const filledSlots = useMemo(
    () => tasks.filter((t) => t.day !== null && t.slot !== null && !t.completed),
    [tasks]
  );
  const allSlotsFilled = filledSlots.length >= TOTAL_SLOTS;

  // Ensure a single empty tray block is visible only when there isn't one and not all slots are filled
  useEffect(() => {
    const hasEmptyTray = tasks.some(
      (t) => t.day === null && t.slot === null && !t.completed
    );
    if (!hasEmptyTray && !allSlotsFilled) {
      setTasks((prev) => [
        ...prev,
        { id: crypto.randomUUID(), title: "", body: "", day: null, slot: null },
      ]);
    }
  }, [tasks, allSlotsFilled]);

  // Drag-n-drop handlers
  const onDragStart = (id: string) => setDraggingId(id);
  const onDragEnd = () => setDraggingId(null);

  const onDropTo = (day: DayIndex, slot: number) => {
    if (!draggingId) return;
    setTasks((prev) => {
      const item = prev.find((t) => t.id === draggingId);
      if (!item) return prev;
      // Prevent duplicate occupancy: remove any task occupying same cell
      const filtered = prev.filter(
        (t) => !(t.day === day && t.slot === slot && !t.completed && t.id !== item.id)
      );
      // Move
      const updated = filtered.map((t) =>
        t.id === item.id ? { ...t, day, slot } : t
      );
      return updated;
    });
    setDraggingId(null);
  };

  const onTrayDrop = () => {
    if (!draggingId) return;
    setTasks((prev) => prev.map((t) => (t.id === draggingId ? { ...t, day: null, slot: null } : t)));
    setDraggingId(null);
  };

  const onTitleChange = (id: string, v: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title: v } : t)));
  };
  const onBodyChange = (id: string, v: string) => {
    // Keep at most two lines
    const trimmed = v.split("\n").slice(0, 2).join("\n");
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, body: trimmed } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Touch support via pointer events fallback to HTML5 DnD
  const draggablesRef = useRef<Record<string, HTMLDivElement | null>>({});

  const registerDrag = (id: string) => (el: HTMLDivElement | null) => {
    draggablesRef.current[id] = el;
  };

  // Visual helpers
  const isDragging = (id: string) => draggingId === id;

  return (
    <div className="planner-root">
      <header className="planner-header">
        <div className="title">Weekly Planner</div>
        <div className="meta">
          <Link href="/">Home</Link>
        </div>
      </header>

      <main className="planner-canvas" role="application" aria-label="Weekly Planner">
        {/* Grid */}
        <div className="grid">
          {/* Red reference line positioned by JS (snaps between hours) */}
          <div className="red-line-h" aria-hidden style={{ top: redLineTop }} />
          <div className="time-badge" aria-hidden style={{ top: redLineTop }}>{timeLabel}</div>
          {/* Day headers */}
          <div className="day-row">
            {DAYS.map((d) => (
              <div key={d} className="day-col day-header">
                {d}
              </div>
            ))}
          </div>

          {/* Slots rows */}
          {SLOTS.map((slotIdx) => (
            <div className="slot-row" key={slotIdx}>
              {DAYS.map((_, dayIdx) => {
                const day = dayIdx as DayIndex;
                const occupying = tasks.find(
                  (t) => t.day === day && t.slot === slotIdx && !t.completed
                );
                const isOver = draggingId && !occupying;
                return (
                  <div
                    key={`${day}-${slotIdx}`}
                    className={`slot-hole ${isOver ? "slot-over" : ""}`}
                    ref={slotIdx === 0 && dayIdx === 0 ? firstSlotRef : undefined}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDropTo(day, slotIdx);
                    }}
                    onPointerUp={() => {
                      // If pointer ends inside, drop current dragging
                      if (draggingId) onDropTo(day, slotIdx);
                    }}
                  >
                    {occupying && (
                      <TaskBlock
                        key={occupying.id}
                        task={occupying}
                        onStart={() => onDragStart(occupying.id)}
                        onEnd={onDragEnd}
                        onTitleChange={onTitleChange}
                        onBodyChange={onBodyChange}
                        onRemove={removeTask}
                        register={registerDrag(occupying.id)}
                        dragging={isDragging(occupying.id)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>

      {/* Bottom tray mirrors grid widths so the tray task matches a slot size */}
      <footer
        className="tray"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onTrayDrop}
        onPointerUp={onTrayDrop}
     >
        {(() => {
          const trayTask = tasks.find(
            (t) => t.day === null && t.slot === null && !t.completed
          );
          return (
            <div className="slot-hole tray-single" style={{ gridColumn: "2 / span 1" }}>
              {trayTask && (
                <TaskBlock
                  key={trayTask.id}
                  task={trayTask}
                  onStart={() => onDragStart(trayTask.id)}
                  onEnd={onDragEnd}
                  onTitleChange={onTitleChange}
                  onBodyChange={onBodyChange}
                  onRemove={removeTask}
                  register={registerDrag(trayTask.id)}
                  dragging={isDragging(trayTask.id)}
                />
              )}
            </div>
          );
        })()}
      </footer>
    </div>
  );
}

function TaskBlock({
  task,
  onStart,
  onEnd,
  onTitleChange,
  onBodyChange,
  onRemove,
  register,
  dragging,
}: {
  task: Task;
  onStart: () => void;
  onEnd: () => void;
  onTitleChange: (id: string, v: string) => void;
  onBodyChange: (id: string, v: string) => void;
  onRemove: (id: string) => void;
  register: (el: HTMLDivElement | null) => void;
  dragging: boolean;
}) {
  const onDragStartHandler = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    onStart();
  };
  const onDragEndHandler = () => onEnd();

  return (
    <div
      ref={register}
      className={`task ${dragging ? "dragging" : ""}`}
      draggable
      onDragStart={onDragStartHandler}
      onDragEnd={onDragEndHandler}
      onPointerDown={onStart}
      onPointerUp={onEnd}
    >
      <button className="task-close" onClick={() => onRemove(task.id)} aria-label="Remove task">
        ×
      </button>
      <div className="task-content">
        <input
          className="task-title"
          placeholder="Title"
          value={task.title}
          onChange={(e) => onTitleChange(task.id, e.target.value)}
        />
        <textarea
          className="task-body"
          placeholder="Details (max 2 lines)"
          value={task.body}
          onChange={(e) => onBodyChange(task.id, e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}
