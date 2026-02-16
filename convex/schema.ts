import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(), // Ejemplo: "XJ81"
    hostId: v.optional(v.string()),
    guestId: v.optional(v.string()),
    scores: v.optional(v.object({ p1: v.number(), p2: v.number() })),
    currentRound: v.optional(v.number()),
    winner: v.optional(v.string()), // "p1" o "p2"
    p1Ready: v.optional(v.boolean()),
    p2Ready: v.optional(v.boolean()),
    status: v.string(), // "waiting", "playing", "ended"
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.string(),
    playerId: v.string(), // ID de sesión único
    name: v.string(),
    x: v.number(),
    z: v.number(),
    angle: v.number(),
    color: v.string(),
    isDead: v.boolean(),
  }).index("by_room", ["roomId"]),

  trails: defineTable({
    roomId: v.id("rooms"),
    x: v.number(),
    z: v.number(),
    ownerId: v.string(),
    color: v.string(),
  }).index("by_room", ["roomId"]),
});