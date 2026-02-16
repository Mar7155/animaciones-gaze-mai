import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updatePosition = mutation({
  args: {
    roomId: v.string(), // Ahora requerimos el ID de la sala
    playerId: v.string(),
    playerName: v.string(),
    isHost: v.boolean(),
    x: v.number(),
    z: v.number(),
    angle: v.number()
  },
  handler: async (ctx, args) => {
    // Buscamos al jugador específico dentro de esa sala
    const existing = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        x: args.x,
        z: args.z,
        angle: args.angle
      });
    } else {
      // Si por alguna razón no existe (ej. recarga rápida), lo creamos vinculado a la sala
      await ctx.db.insert("players", {
        roomId: args.roomId,
        playerId: args.playerId,
        x: args.x,
        z: args.z,
        angle: args.angle,
        isDead: false,
        name: args.playerName,
        color: args.isHost ? "red" : "blue"
      });
    }
  },
});

// Notificar muerte a los demás en la sala
export const notifyDeath = mutation({
  args: { roomId: v.id("rooms"), playerId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "playing") return;

    // Determinar quién ganó el punto
    const isP1Dead = args.playerId === room.hostId;
    const isP2Dead = args.playerId === room.guestId;

    if (!isP1Dead && !isP2Dead) return; // ID desconocido

    const newScores = room.scores || { p1: 0, p2: 0 };
    if (isP1Dead) newScores.p2++;
    if (isP2Dead) newScores.p1++;

    // Verificar condición de victoria (Primero a 6)
    let winner = undefined;
    let status = "playing";
    if (newScores.p1 >= 6) { winner = "p1"; status = "ended"; }
    if (newScores.p2 >= 6) { winner = "p2"; status = "ended"; }

    // Actualizar Sala
    await ctx.db.patch(room._id, {
      scores: newScores,
      currentRound: (room.currentRound || 1) + 1,
      winner,
      status
    });

    // Reiniciar Ronda (si no terminó el juego)
    if (status === "playing") {
      // 1. Revivir jugadores y resetear posiciones
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();

      for (const p of players) {
        const isHost = p.playerId === room.hostId;
        await ctx.db.patch(p._id, {
          isDead: false,
          x: isHost ? -10 : 10,
          z: 30,
          angle: 0
        });
      }

      // 2. Limpiar Estelas
      const trails = await ctx.db
        .query("trails")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();

      for (const t of trails) {
        await ctx.db.delete(t._id);
      }
    }
  },
});

// Query filtrada: Solo obtener jugadores de MI sala
export const getPlayersInRoom = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});