export const Permissions = {
  ADMINISTRATOR: 0x8n,
  MANAGE_GUILD: 0x20n,
  MANAGE_CHANNELS: 0x10n,
  MANAGE_ROLES: 0x10000000n,
  KICK_MEMBERS: 0x2n,
  BAN_MEMBERS: 0x4n,
};

export function hasPermission(userPerms: string | bigint | number, permission: bigint): boolean {
  try {
    const bitfield = BigInt(userPerms);
    return (bitfield & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR || (bitfield & permission) === permission;
  } catch {
    return false;
  }
}
