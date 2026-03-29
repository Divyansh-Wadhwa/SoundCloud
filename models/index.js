import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export const Album = sequelize.define('Album', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cover: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export const Song = sequelize.define('Song', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'Other',
  },
  albumId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
});

export const Playlist = sequelize.define('Playlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

export const RecentlyPlayed = sequelize.define('RecentlyPlayed', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  songId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  playedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Associations
Album.hasMany(Song, { foreignKey: 'albumId', onDelete: 'SET NULL', as: 'songs' });
Song.belongsTo(Album, { foreignKey: 'albumId', as: 'album' });

User.hasMany(Playlist, { foreignKey: 'userId', onDelete: 'CASCADE', as: 'playlists' });
Playlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Many-to-Many: Playlist <-> Song
Playlist.belongsToMany(Song, { through: 'PlaylistSongs', as: 'songs', foreignKey: 'playlistId' });
Song.belongsToMany(Playlist, { through: 'PlaylistSongs', as: 'playlists', foreignKey: 'songId' });

// Many-to-Many: User <-> Song for Favorites
User.belongsToMany(Song, { through: 'UserFavorites', as: 'favorites', foreignKey: 'userId' });
Song.belongsToMany(User, { through: 'UserFavorites', as: 'favoritedBy', foreignKey: 'songId' });

// RecentlyPlayed relations
User.hasMany(RecentlyPlayed, { foreignKey: 'userId', onDelete: 'CASCADE', as: 'recentlyPlayed' });
RecentlyPlayed.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Song.hasMany(RecentlyPlayed, { foreignKey: 'songId', onDelete: 'CASCADE', as: 'playedRecords' });
RecentlyPlayed.belongsTo(Song, { foreignKey: 'songId', as: 'song' });

export default {
  sequelize,
  User,
  Album,
  Song,
  Playlist,
  RecentlyPlayed,
};
