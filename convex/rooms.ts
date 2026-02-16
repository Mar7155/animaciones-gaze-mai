import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Crear una sala nueva
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const playerId = crypto.randomUUID();

    const roomId = await ctx.db.insert("rooms", {
      code,
      status: "waiting",
      hostId: playerId,
      currentRound: 1,
      scores: { p1: 0, p2: 0 },
      p1Ready: false,
      p2Ready: false
    });

    // Insertar al host como jugador
    await ctx.db.insert("players", {
      roomId,
      name: args.name,
      x: -10, z: 30, angle: 0,
      color: "#00ffff",
      playerId: playerId,
      isDead: false
    });

    return { roomId, code, playerId };
  },
});

// Unirse a una sala existente
export const join = mutation({
  args: { code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!room) throw new Error("Sala no encontrada");
    if (room.guestId) throw new Error("La sala ya está llena");

    const playerId = crypto.randomUUID();

    // Actualizar la sala con el invitado
    await ctx.db.patch(room._id, { guestId: playerId });

    // Insertar jugador invitado
    await ctx.db.insert("players", {
      roomId: room._id,
      name: args.name,
      x: 10, z: 30, angle: 0,
      color: "#ff6600",
      playerId: playerId,
      isDead: false
    });

    return { roomId: room._id, playerId };
  },
});

// Marcar jugador como listo
export const setReady = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Sala no encontrada");

    const update: any = {};
    if (args.playerId === room.hostId) update.p1Ready = true;
    if (args.playerId === room.guestId) update.p2Ready = true;

    await ctx.db.patch(room._id, update);

    // Si ambos están listos, iniciar juego
    const freshRoom = await ctx.db.get(args.roomId);
    if (freshRoom?.p1Ready && freshRoom?.p2Ready) {
      await ctx.db.patch(room._id, { status: "playing" });
    }
  }
});

// Obtener estado de la sala
export const get = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  }
});