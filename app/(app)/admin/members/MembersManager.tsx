"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";
import { SUN_DIRECTORY, getSunsByMission, MISSION_COUNT, getMissionName, type SunEntry } from "@/lib/constants/sun-directory";

export default function MembersManager() {
  const [search, setSearch] = useState("");
  const [missionFilter, setMissionFilter] = useState<string>("all");
  const [sunFilter, setSunFilter] = useState<string>("all");

  const sunOptions = useMemo(() => {
    if (missionFilter === "all") return SUN_DIRECTORY;
    return getSunsByMission(Number(missionFilter));
  }, [missionFilter]);

  const filtered = useMemo(() => {
    let entries: SunEntry[] = sunFilter !== "all"
      ? SUN_DIRECTORY.filter((s) => s.sunNumber === Number(sunFilter))
      : missionFilter !== "all"
        ? getSunsByMission(Number(missionFilter))
        : SUN_DIRECTORY;

    if (search.trim()) {
      const q = search.trim();
      entries = entries
        .map((entry) => ({
          ...entry,
          members: entry.members.filter((m) => m.includes(q)),
        }))
        .filter((entry) => entry.members.length > 0 || entry.sunLeader.includes(q));
    }

    return entries;
  }, [search, missionFilter, sunFilter]);

  const totalMembers = useMemo(
    () => filtered.reduce((acc, e) => acc + e.members.length, 0),
    [filtered]
  );

  function handleMissionChange(val: string | null) {
    setMissionFilter(val ?? "all");
    setSunFilter("all");
  }

  function handleSunChange(val: string | null) {
    setSunFilter(val ?? "all");
  }

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-2 relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="순원 이름 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={missionFilter} onValueChange={handleMissionChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="선교회 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 선교회</SelectItem>
                {Array.from({ length: MISSION_COUNT }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {getMissionName(i + 1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sunFilter} onValueChange={handleSunChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="순 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 순</SelectItem>
                {sunOptions.map((s) => (
                  <SelectItem key={s.sunNumber} value={String(s.sunNumber)}>
                    {s.sunNumber}순 ({s.sunLeader})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length}순 · 순원 {totalMembers}명 표시 중
          </p>
        </CardContent>
      </Card>

      {/* 순별 멤버 목록 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            검색 결과가 없습니다.
          </CardContent>
        </Card>
      ) : (
        filtered.map((entry) => (
          <Card key={entry.sunNumber}>
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {entry.sunNumber}순
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    순장: {entry.sunLeader}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getMissionName(entry.missionId)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    {entry.members.length}명
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {entry.members.map((member) => {
                  const isMatch = search.trim() && member.includes(search.trim());
                  return (
                    <span
                      key={member}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        isMatch
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent"
                      }`}
                    >
                      {member}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
