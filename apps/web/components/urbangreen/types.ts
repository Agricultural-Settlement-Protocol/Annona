/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
}

export interface RoadmapItem {
  title: string;
  description: string;
  details: string[];
}

export interface LiveTelemetryCity {
  id: string;
  name: string;
  country: string;
  imageUrl: string;
  plantHealth: number;
  temperature: number;
  humidity: number;
  activeSensors: number;
  co2Offset: number;
}
