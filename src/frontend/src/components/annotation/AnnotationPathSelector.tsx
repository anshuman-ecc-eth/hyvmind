import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { AnnotationPath } from "../../types/annotation";

interface PublishedPath {
  curation: string;
  swarm: string;
  location: string;
  graphId: string;
}

interface Props {
  path: AnnotationPath;
  onChange: (path: AnnotationPath) => void;
  publishedPaths: PublishedPath[];
}

const NEW = "__new__";

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

export function AnnotationPathSelector({
  path,
  onChange,
  publishedPaths,
}: Props) {
  const [newCuration, setNewCuration] = useState(
    path.isNewCuration ? path.curation : "",
  );
  const [newSwarm, setNewSwarm] = useState(path.isNewSwarm ? path.swarm : "");
  const [newLocation, setNewLocation] = useState(
    path.isNewLocation ? path.location : "",
  );

  const allCurations = unique(publishedPaths.map((p) => p.curation));
  const filteredSwarms =
    path.curation && !path.isNewCuration
      ? unique(
          publishedPaths
            .filter((p) => p.curation === path.curation)
            .map((p) => p.swarm),
        )
      : unique(publishedPaths.map((p) => p.swarm));
  const filteredLocations =
    path.swarm && !path.isNewSwarm
      ? unique(
          publishedPaths
            .filter(
              (p) => p.curation === path.curation && p.swarm === path.swarm,
            )
            .map((p) => p.location),
        )
      : unique(publishedPaths.map((p) => p.location));

  function onCurationChange(val: string) {
    if (val === NEW) {
      onChange({
        ...path,
        curation: newCuration,
        isNewCuration: true,
        swarm: "",
        isNewSwarm: false,
        location: "",
        isNewLocation: false,
      });
    } else {
      onChange({
        ...path,
        curation: val,
        isNewCuration: false,
        swarm: "",
        isNewSwarm: false,
        location: "",
        isNewLocation: false,
      });
    }
  }

  function onSwarmChange(val: string) {
    if (val === NEW) {
      onChange({
        ...path,
        swarm: newSwarm,
        isNewSwarm: true,
        location: "",
        isNewLocation: false,
      });
    } else {
      onChange({
        ...path,
        swarm: val,
        isNewSwarm: false,
        location: "",
        isNewLocation: false,
      });
    }
  }

  function onLocationChange(val: string) {
    if (val === NEW) {
      onChange({ ...path, location: newLocation, isNewLocation: true });
    } else {
      onChange({ ...path, location: val, isNewLocation: false });
    }
  }

  return (
    <div className="space-y-3">
      {/* Curation */}
      <div className="space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Curation
        </p>
        <Select
          value={path.isNewCuration ? NEW : path.curation || ""}
          onValueChange={onCurationChange}
        >
          <SelectTrigger
            data-ocid="annotation-path.curation.select"
            className="border-2 border-dashed border-border rounded-none font-mono text-xs bg-background"
          >
            <SelectValue placeholder="Select or create..." />
          </SelectTrigger>
          <SelectContent className="font-mono text-xs rounded-none border-2 border-border">
            {allCurations.map((c) => (
              <SelectItem key={c} value={c} className="font-mono text-xs">
                {c}
              </SelectItem>
            ))}
            <SelectItem value={NEW} className="font-mono text-xs text-primary">
              + Create New
            </SelectItem>
          </SelectContent>
        </Select>
        {path.isNewCuration && (
          <Input
            data-ocid="annotation-path.curation.input"
            placeholder="Enter curation name..."
            value={newCuration}
            onChange={(e) => {
              setNewCuration(e.target.value);
              onChange({ ...path, curation: e.target.value });
            }}
            className="font-mono text-xs border-2 border-dashed border-primary rounded-none bg-background"
          />
        )}
      </div>

      {/* Swarm */}
      <div className="space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Swarm
        </p>
        <Select
          value={path.isNewSwarm ? NEW : path.swarm || ""}
          onValueChange={onSwarmChange}
          disabled={!path.curation && !path.isNewCuration}
        >
          <SelectTrigger
            data-ocid="annotation-path.swarm.select"
            className="border-2 border-dashed border-border rounded-none font-mono text-xs bg-background disabled:opacity-50"
          >
            <SelectValue placeholder="Select or create..." />
          </SelectTrigger>
          <SelectContent className="font-mono text-xs rounded-none border-2 border-border">
            {filteredSwarms.map((s) => (
              <SelectItem key={s} value={s} className="font-mono text-xs">
                {s}
              </SelectItem>
            ))}
            <SelectItem value={NEW} className="font-mono text-xs text-primary">
              + Create New
            </SelectItem>
          </SelectContent>
        </Select>
        {path.isNewSwarm && (
          <Input
            data-ocid="annotation-path.swarm.input"
            placeholder="Enter swarm name..."
            value={newSwarm}
            onChange={(e) => {
              setNewSwarm(e.target.value);
              onChange({ ...path, swarm: e.target.value });
            }}
            className="font-mono text-xs border-2 border-dashed border-primary rounded-none bg-background"
          />
        )}
      </div>

      {/* Location */}
      <div className="space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Location
        </p>
        <Select
          value={path.isNewLocation ? NEW : path.location || ""}
          onValueChange={onLocationChange}
          disabled={!path.swarm && !path.isNewSwarm}
        >
          <SelectTrigger
            data-ocid="annotation-path.location.select"
            className="border-2 border-dashed border-border rounded-none font-mono text-xs bg-background disabled:opacity-50"
          >
            <SelectValue placeholder="Select or create..." />
          </SelectTrigger>
          <SelectContent className="font-mono text-xs rounded-none border-2 border-border">
            {filteredLocations.map((l) => (
              <SelectItem key={l} value={l} className="font-mono text-xs">
                {l}
              </SelectItem>
            ))}
            <SelectItem value={NEW} className="font-mono text-xs text-primary">
              + Create New
            </SelectItem>
          </SelectContent>
        </Select>
        {path.isNewLocation && (
          <Input
            data-ocid="annotation-path.location.input"
            placeholder="Enter location name..."
            value={newLocation}
            onChange={(e) => {
              setNewLocation(e.target.value);
              onChange({ ...path, location: e.target.value });
            }}
            className="font-mono text-xs border-2 border-dashed border-primary rounded-none bg-background"
          />
        )}
      </div>
    </div>
  );
}
