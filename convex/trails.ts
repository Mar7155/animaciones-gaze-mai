import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addSegment = mutation({
  args: { 
    roomId: v.id("rooms"), 
    x: v.number(), 
    z: v.number(), 
    ownerId: v.string(),
    color: v.string() 
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("trails", {
      roomId: args.roomId,
      x: args.x,
      z: args.z,
      ownerId: args.ownerId,
      color: args.color
    });
  },
});

export const getTrails = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trails")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});