import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

const ADMIN_PIN = "196700";

const statusOptions = [
  "未",
  "○",
  "×",
  "△",
];

function App() {
  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [page, setPage] = useState("home");

  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [newPlayerName, setNewPlayerName] = useState("");

  const [newEventDate, setNewEventDate] = useState("");
  const [newEventType, setNewEventType] = useState("練習");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventMeetingTime, setNewEventMeetingTime] =
    useState("");
  const [newEventPlace, setNewEventPlace] = useState("");
  const [newEventUniform, setNewEventUniform] = useState("");

  const [editingEventId, setEditingEventId] = useState(null);

  const [playerMemos, setPlayerMemos] = useState({});
  const [playerPenalties, setPlayerPenalties] =
    useState({});

  const [generalNotice, setGeneralNotice] =
    useState("");

  const [penaltyNotice, setPenaltyNotice] =
    useState("");

  useEffect(() => {
    loadData();

    if (
      sessionStorage.getItem(
        "takaishi_admin"
      ) === "true"
    ) {
      setIsAdmin(true);
    }
  }, []);

  async function loadData() {
    const results = await Promise.all([
      supabase
        .from("players")
        .select("*")
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("events")
        .select("*")
        .order("date", {
          ascending: true,
        }),

      supabase
        .from("attendance")
        .select("*"),

      supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const [
      playersRes,
      eventsRes,
      attendanceRes,
      settingsRes,
    ] = results;

    if (playersRes.data) {
      setPlayers(playersRes.data);

      const memoData = {};
      const penaltyData = {};

      playersRes.data.forEach((player) => {
        memoData[player.id] =
          player.memo || "";

        penaltyData[player.id] =
          player.penalty || "";
      });

      setPlayerMemos(memoData);
      setPlayerPenalties(penaltyData);
    }

    if (eventsRes.data) {
      setEvents(eventsRes.data);
    }

    if (attendanceRes.data) {
      setAttendance(
        attendanceRes.data
      );
    }

    if (settingsRes.data) {
      setGeneralNotice(
        settingsRes.data.general_notice ||
          ""
      );

      setPenaltyNotice(
        settingsRes.data.penalty_notice ||
          ""
      );
    }

    if (playersRes.error) {
      console.error(
        "players:",
        playersRes.error
      );
    }

    if (eventsRes.error) {
      console.error(
        "events:",
        eventsRes.error
      );
    }

    if (attendanceRes.error) {
      console.error(
        "attendance:",
        attendanceRes.error
      );
    }

    if (settingsRes.error) {
      console.error(
        "site_settings:",
        settingsRes.error
      );
    }
  }

  function loginAdmin() {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      setPage("admin");

      sessionStorage.setItem(
        "takaishi_admin",
        "true"
      );

      setPin("");
    } else {
      alert(
        "暗証番号が違います"
      );

      setPin("");
    }
  }

  function logoutAdmin() {
    setIsAdmin(false);
    setPage("home");

    sessionStorage.removeItem(
      "takaishi_admin"
    );
  }

  async function addPlayer() {
    const name =
      newPlayerName.trim();

    if (!name) {
      alert(
        "選手名を入力してください"
      );

      return;
    }

    const nextOrder =
      players.length > 0
        ? Math.max(
            ...players.map(
              (player) =>
                player.sort_order ?? 0
            )
          ) + 1
        : 1;

    const result =
      await supabase
        .from("players")
        .insert({
          name,
          sort_order: nextOrder,
          memo: "",
          penalty: "",
        })
        .select()
        .single();

    if (result.error) {
      console.error(
        result.error
      );

      alert(
        "選手の追加に失敗しました"
      );

      return;
    }

    setPlayers((current) => [
      ...current,
      result.data,
    ]);

    setPlayerMemos((current) => ({
      ...current,
      [result.data.id]: "",
    }));

    setPlayerPenalties((current) => ({
      ...current,
      [result.data.id]: "",
    }));

    setNewPlayerName("");
  }

  async function deletePlayer(
    playerId
  ) {
    const player = players.find(
      (item) =>
        item.id === playerId
    );

    if (!player) return;

    if (
      !window.confirm(
        player.name +
          "を削除しますか？"
      )
    ) {
      return;
    }

    const result =
      await supabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (result.error) {
      console.error(
        result.error
      );

      alert(
        "選手の削除に失敗しました"
      );

      return;
    }

    setPlayers((current) =>
      current.filter(
        (item) =>
          item.id !== playerId
      )
    );

    setAttendance((current) =>
      current.filter(
        (item) =>
          item.player_id !==
          playerId
      )
    );

    setPlayerMemos((current) => {
      const updated = {
        ...current,
      };

      delete updated[playerId];

      return updated;
    });

    setPlayerPenalties((current) => {
      const updated = {
        ...current,
      };

      delete updated[playerId];

      return updated;
    });
  }

  async function movePlayer(
    playerId,
    direction
  ) {
    const index =
      players.findIndex(
        (player) =>
          player.id === playerId
      );

    if (index < 0) return;

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= players.length
    ) {
      return;
    }

    const updatedPlayers = [
      ...players,
    ];

    [
      updatedPlayers[index],
      updatedPlayers[targetIndex],
    ] = [
      updatedPlayers[targetIndex],
      updatedPlayers[index],
    ];

    const reorderedPlayers =
      updatedPlayers.map(
        (
          player,
          playerIndex
        ) => ({
          ...player,
          sort_order:
            playerIndex + 1,
        })
      );

    setPlayers(
      reorderedPlayers
    );

    const results =
      await Promise.all(
        reorderedPlayers.map(
          (player) =>
            supabase
              .from("players")
              .update({
                sort_order:
                  player.sort_order,
              })
              .eq(
                "id",
                player.id
              )
        )
      );

    const failed =
      results.find(
        (result) =>
          result.error
      );

    if (failed) {
      console.error(
        "player reorder:",
        failed.error
      );

      alert(
        "並び替えの保存に失敗しました。"
      );

      await loadData();
    }
  }

  async function savePlayerMemo(
    playerId,
    memo
  ) {
    const trimmedMemo =
      memo.trim();

    const result =
      await supabase
        .from("players")
        .update({
          memo: trimmedMemo,
        })
        .eq("id", playerId);

    if (result.error) {
      console.error(
        "player memo:",
        result.error
      );

      alert(
        "備考の保存に失敗しました"
      );

      return;
    }

    setPlayers((current) =>
      current.map(
        (player) =>
          player.id === playerId
            ? {
                ...player,
                memo: trimmedMemo,
              }
            : player
      )
    );
  }

  async function savePlayerPenalty(
    playerId,
    penalty
  ) {
    const trimmedPenalty =
      penalty.trim();

    const result =
      await supabase
        .from("players")
        .update({
          penalty:
            trimmedPenalty,
        })
        .eq("id", playerId);

    if (result.error) {
      console.error(
        "player penalty:",
        result.error
      );

      alert(
        "ペナルティの保存に失敗しました"
      );

      return;
    }

    setPlayers((current) =>
      current.map(
        (player) =>
          player.id === playerId
            ? {
                ...player,
                penalty:
                  trimmedPenalty,
              }
            : player
      )
    );
  }

  async function saveGeneralNotice(
    value
  ) {
    const result =
      await supabase
        .from("site_settings")
        .update({
          general_notice:
            value,
        })
        .eq("id", 1);

    if (result.error) {
      console.error(
        "general notice:",
        result.error
      );

      alert(
        "全体連絡の保存に失敗しました"
      );

      return;
    }

    setGeneralNotice(value);
  }

  async function savePenaltyNotice(
    value
  ) {
    const result =
      await supabase
        .from("site_settings")
        .update({
          penalty_notice:
            value,
        })
        .eq("id", 1);

    if (result.error) {
      console.error(
        "penalty notice:",
        result.error
      );

      alert(
        "ペナルティの保存に失敗しました"
      );

      return;
    }

    setPenaltyNotice(value);
  }

  function startEditEvent(event) {
    setEditingEventId(event.id);

    setNewEventDate(
      event.date || ""
    );

    setNewEventType(
      event.type || "練習"
    );

    setNewEventTitle(
      event.title || ""
    );

    setNewEventTime(
      event.time || ""
    );

    setNewEventMeetingTime(
      event.meeting_time || ""
    );

    setNewEventPlace(
      event.place || ""
    );

    setNewEventUniform(
      event.uniform || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditEvent() {
    setEditingEventId(null);
    setNewEventDate("");
    setNewEventType("練習");
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventMeetingTime("");
    setNewEventPlace("");
    setNewEventUniform("");
  }

  async function saveEvent() {
    if (!newEventDate) {
      alert(
        "日付を入力してください"
      );

      return;
    }

    if (
      !newEventTitle.trim()
    ) {
      alert(
        "相手チーム名などを入力してください"
      );

      return;
    }

    const data = {
      date: newEventDate,
      type: newEventType,
      title:
        newEventTitle.trim(),
      time:
        newEventTime.trim(),
      meeting_time:
        newEventMeetingTime.trim(),
      place:
        newEventPlace.trim(),
      uniform:
        newEventUniform.trim(),
    };

    let result;

    if (editingEventId) {
      result =
        await supabase
          .from("events")
          .update(data)
          .eq(
            "id",
            editingEventId
          )
          .select()
          .single();
    } else {
      result =
        await supabase
          .from("events")
          .insert(data)
          .select()
          .single();
    }

    if (result.error) {
      console.error(
        result.error
      );

      alert(
        editingEventId
          ? "予定の編集に失敗しました"
          : "予定の追加に失敗しました"
      );

      return;
    }

    if (editingEventId) {
      setEvents((current) =>
        current
          .map((event) =>
            event.id ===
            editingEventId
              ? result.data
              : event
          )
          .sort(
            (a, b) =>
              new Date(a.date) -
              new Date(b.date)
          )
      );
    } else {
      setEvents((current) =>
        [
          ...current,
          result.data,
        ].sort(
          (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        )
      );
    }

    cancelEditEvent();
  }

  async function deleteEvent(
    eventId
  ) {
    const event = events.find(
      (item) =>
        item.id === eventId
    );

    if (!event) return;

    if (
      !window.confirm(
        event.title +
          "を削除しますか？"
      )
    ) {
      return;
    }

    const result =
      await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

    if (result.error) {
      console.error(
        result.error
      );

      alert(
        "予定の削除に失敗しました"
      );

      return;
    }

    setEvents((current) =>
      current.filter(
        (item) =>
          item.id !== eventId
      )
    );

    setAttendance((current) =>
      current.filter(
        (item) =>
          item.event_id !== eventId
      )
    );
  }

  function getAttendance(
    playerId,
    eventId
  ) {
    return attendance.find(
      (item) =>
        item.player_id ===
          playerId &&
        item.event_id ===
          eventId
    );
  }

  async function updateAttendance(
    playerId,
    eventId,
    status
  ) {
    const previous =
      getAttendance(
        playerId,
        eventId
      );

    let memo =
      previous?.memo || "";

    if (status === "△") {
      memo =
        window.prompt(
          "⚠️ △の場合は備考を入力してください",
          memo
        ) || "";

      memo = memo.trim();

      if (!memo) {
        alert(
          "⚠️ △の場合は備考を入力してください"
        );

        return;
      }
    }

    const result =
      await supabase
        .from("attendance")
        .upsert(
          {
            player_id:
              playerId,
            event_id:
              eventId,
            status,
            memo:
              memo || null,
            late_change: false,
          },
          {
            onConflict:
              "player_id,event_id",
          }
        );

    if (result.error) {
      console.error(
        result.error
      );

      alert(
        "出欠の更新に失敗しました"
      );

      return;
    }

    setAttendance(
      (current) => {
        const filtered =
          current.filter(
            (item) =>
              !(
                item.player_id ===
                  playerId &&
                item.event_id ===
                  eventId
              )
          );

        return [
          ...filtered,
          {
            player_id:
              playerId,
            event_id:
              eventId,
            status,
            memo:
              memo || null,
            late_change: false,
          },
        ];
      }
    );
  }

  function formatDate(
    dateString
  ) {
    if (!dateString) {
      return "";
    }

    const date = new Date(
      dateString +
        "T00:00:00"
    );

    return date.toLocaleDateString(
      "ja-JP",
      {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      }
    );
  }

  function getCounts(eventId) {
    const result = {
      "○": 0,
      "×": 0,
      "△": 0,
      "未": 0,
    };

    players.forEach(
      (player) => {
        const item =
          getAttendance(
            player.id,
            eventId
          );

        const status =
          item?.status || "未";

        if (
          result[status] !==
          undefined
        ) {
          result[status]++;
        }
      }
    );

    return result;
  }

  function getDeadline(
    eventDate
  ) {
    if (!eventDate) {
      return null;
    }

    const date = new Date(
      eventDate +
        "T00:00:00"
    );

    const day =
      date.getDay();

    let daysFromFriday;

    if (day === 0) {
      daysFromFriday = 2;
    } else if (day === 6) {
      daysFromFriday = 1;
    } else {
      daysFromFriday =
        (day + 2) % 7;

      if (
        daysFromFriday === 0
      ) {
        daysFromFriday = 7;
      }
    }

    date.setDate(
      date.getDate() -
        daysFromFriday
    );

    date.setHours(
      17,
      0,
      0,
      0
    );

    return date;
  }

  function isDeadlinePassed(
    event
  ) {
    const deadline =
      getDeadline(event.date);

    if (!deadline) {
      return false;
    }

    return (
      new Date() >= deadline
    );
  }

  function getNextEvent() {
    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const upcomingEvents =
      events
        .filter((event) => {
          const eventDate =
            new Date(
              event.date +
                "T00:00:00"
            );

          return (
            eventDate >= today
          );
        })
        .sort(
          (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        );

    return (
      upcomingEvents[0] ||
      null
    );
  }

  function EventInfo({
    event,
    compact = false,
  }) {
    const counts =
      getCounts(event.id);

    return (
      <>
        <div className="event-date">
          {formatDate(
            event.date
          )}
        </div>

        <div className="event-type">
          {event.type}
        </div>

        <div className="event-vs">
          vs {event.title}
        </div>

        {event.time && (
          <div>
            ⌚️ {event.time}
          </div>
        )}

        {event.meeting_time && (
          <div>
            ⌛{" "}
            {event.meeting_time}
          </div>
        )}

        {event.place && (
          <div>
            📍 {event.place}
          </div>
        )}

        {event.uniform && (
          <div>
            👕 {event.uniform}
          </div>
        )}

        {!compact && (
          <div className="attendance-counts">
            <span>👤</span>

            <span>
              ○:{counts["○"]}
            </span>

            <span>
              ×:{counts["×"]}
            </span>

            <span>
              △:{counts["△"]}
            </span>

            <span>
              未:{counts["未"]}
            </span>
          </div>
        )}
      </>
    );
  }

  function CompactPage() {
    const nextEvent =
      getNextEvent();

    const deadlinePassed =
      nextEvent
        ? isDeadlinePassed(
            nextEvent
          )
        : false;

    const counts =
      nextEvent
        ? getCounts(
            nextEvent.id
          )
        : {
            "○": 0,
            "×": 0,
            "△": 0,
            "未": 0,
          };

    return (
      <div className="app compact-page">
        <header className="header compact-header">
          <div>
            <h1>
              TAKAISHI.FC
            </h1>

            <p>
              出欠確認
            </p>
          </div>

          <button
            className="compact-back"
            onClick={() =>
              setPage("home")
            }
          >
            戻る
          </button>
        </header>

        <main className="compact-main">
          <div className="compact-title">
            <strong>
              📸 締切確認用
            </strong>

            {nextEvent && (
              <span className="compact-counts">
                👤
                ○:{counts["○"]}
                ×:{counts["×"]}
                △:{counts["△"]}
                未:{counts["未"]}
              </span>
            )}
          </div>

          {!nextEvent ? (
            <p className="empty-message">
              今後の予定がありません。
            </p>
          ) : (
            <>
              <div className="compact-top-grid">
                <div className="compact-event-summary">
                  <div className="compact-event-main">
                    <strong>
                      {formatDate(
                        nextEvent.date
                      )}
                    </strong>

                    <span>
                      {nextEvent.type}
                    </span>

                    <span>
                      vs{" "}
                      {nextEvent.title}
                    </span>
                  </div>

                  <div className="compact-event-details">
                    {nextEvent.time && (
                      <span>
                        ⌚️{" "}
                        {nextEvent.time}
                      </span>
                    )}

                    {nextEvent.meeting_time && (
                      <span>
                        ⌛{" "}
                        {
                          nextEvent.meeting_time
                        }
                      </span>
                    )}

                    {nextEvent.place && (
                      <span>
                        📍{" "}
                        {
                          nextEvent.place
                        }
                      </span>
                    )}

                    {nextEvent.uniform && (
                      <span>
                        👕{" "}
                        {
                          nextEvent.uniform
                        }
                      </span>
                    )}
                  </div>
                </div>

                <div className="compact-penalty-box">
                  <div className="compact-penalty-title">
                    ⚠️ PENALTY
                  </div>

                  <textarea
                    className="compact-penalty-textarea"
                    value={
                      penaltyNotice
                    }
                    placeholder="例：&#10;カワバタ 500円&#10;○○ 2,000円"
                    onChange={(e) =>
                      setPenaltyNotice(
                        e.target.value
                      )
                    }
                    onBlur={(e) =>
                      savePenaltyNotice(
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="compact-table-wrapper">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>
                        氏名
                      </th>

                      <th>
                        回答
                      </th>

                      <th>
                        備考
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {players.map(
                      (
                        player,
                        index
                      ) => {
                        const item =
                          getAttendance(
                            player.id,
                            nextEvent.id
                          );

                        const status =
                          item?.status ||
                          "未";

                        const showWarning =
                          deadlinePassed &&
                          status ===
                            "未";

                        const memo =
                          status ===
                          "△"
                            ? item?.memo ||
                              ""
                            : playerMemos[
                                player.id
                              ] ||
                              player.memo ||
                              "";

                        return (
                          <tr
                            key={
                              player.id
                            }
                            className={
                              index %
                                2 ===
                              1
                                ? "compact-row-alt"
                                : ""
                            }
                          >
                            <th>
                              {
                                player.name
                              }
                            </th>

                            <td
                              className={
                                "compact-status-" +
                                status +
                                (showWarning
                                  ? " compact-warning"
                                  : "")
                              }
                            >
                              {showWarning &&
                                "⚠️"}

                              {status}
                            </td>

                            <td className="compact-memo">
                              {memo}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  if (page === "login") {
    return (
      <div className="app">
        <header className="header">
          <div>
            <h1>
              TAKAISHI.FC
            </h1>

            <p>
              管理者ログイン
            </p>
          </div>
        </header>

        <main className="main">
          <section className="section login-section">
            <h2>
              管理者ログイン
            </h2>

            <input
              type="password"
              inputMode="numeric"
              maxLength="6"
              placeholder="6桁の暗証番号"
              value={pin}
              onChange={(e) =>
                setPin(
                  e.target.value
                )
              }
            />

            <button
              onClick={loginAdmin}
            >
              ログイン
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                setPage("home")
              }
            >
              戻る
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (page === "compact") {
    return <CompactPage />;
  }

  if (
    page === "admin" &&
    isAdmin
  ) {
    return (
      <div className="app">
        <header className="header">
          <div>
            <h1>
              TAKAISHI.FC
            </h1>

            <p>
              管理者ページ
            </p>
          </div>
        </header>

        <main className="main">
          <div className="admin-top">
            <button
              onClick={() =>
                setPage("home")
              }
            >
              出欠画面へ
            </button>

            <button
              className="secondary-button"
              onClick={
                logoutAdmin
              }
            >
              ログアウト
            </button>
          </div>

          <section className="section">
            <h2>
              選手管理
            </h2>

            <div className="player-add">
              <input
                type="text"
                placeholder="選手名"
                value={
                  newPlayerName
                }
                onChange={(e) =>
                  setNewPlayerName(
                    e.target.value
                  )
                }
              />

              <button
                onClick={
                  addPlayer
                }
              >
                選手を追加
              </button>
            </div>

            <div className="player-list">
              {players.map(
                (
                  player,
                  index
                ) => (
                  <div
                    className="player-item"
                    key={
                      player.id
                    }
                  >
                    <span>
                      {
                        player.name
                      }
                    </span>

                    <div className="player-actions">
                      <button
                        className="move-button"
                        disabled={
                          index ===
                          0
                        }
                        onClick={() =>
                          movePlayer(
                            player.id,
                            "up"
                          )
                        }
                      >
                        ↑
                      </button>

                      <button
                        className="move-button"
                        disabled={
                          index ===
                          players.length -
                            1
                        }
                        onClick={() =>
                          movePlayer(
                            player.id,
                            "down"
                          )
                        }
                      >
                        ↓
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deletePlayer(
                            player.id
                          )
                        }
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          <section className="section">
            <h2>
              {editingEventId
                ? "スケジュール編集"
                : "スケジュール追加"}
            </h2>

            <div className="event-form">
              <label>
                日付

                <input
                  type="date"
                  value={
                    newEventDate
                  }
                  onChange={(e) =>
                    setNewEventDate(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                種別

                <select
                  value={
                    newEventType
                  }
                  onChange={(e) =>
                    setNewEventType(
                      e.target.value
                    )
                  }
                >
                  <option>
                    練習
                  </option>

                  <option>
                    練習試合
                  </option>

                  <option>
                    公式戦
                  </option>

                  <option>
                    その他
                  </option>
                </select>
              </label>

              <label>
                vs 相手チーム

                <input
                  type="text"
                  placeholder="泉州FC"
                  value={
                    newEventTitle
                  }
                  onChange={(e) =>
                    setNewEventTitle(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                活動時間

                <input
                  type="text"
                  placeholder="19:00〜21:00"
                  value={
                    newEventTime
                  }
                  onChange={(e) =>
                    setNewEventTime(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                集合時間

                <input
                  type="text"
                  placeholder="18:30"
                  value={
                    newEventMeetingTime
                  }
                  onChange={(e) =>
                    setNewEventMeetingTime(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                場所

                <input
                  type="text"
                  placeholder="グラウンド名"
                  value={
                    newEventPlace
                  }
                  onChange={(e) =>
                    setNewEventPlace(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                ユニフォーム

                <input
                  type="text"
                  placeholder="1st 黄色"
                  value={
                    newEventUniform
                  }
                  onChange={(e) =>
                    setNewEventUniform(
                      e.target.value
                    )
                  }
                />
              </label>

              <button
                onClick={
                  saveEvent
                }
              >
                {editingEventId
                  ? "変更を保存"
                  : "予定を追加"}
              </button>

              {editingEventId && (
                <button
                  className="secondary-button"
                  onClick={
                    cancelEditEvent
                  }
                >
                  編集をキャンセル
                </button>
              )}
            </div>

            <div className="event-list">
              {events.map(
                (
                  event,
                  index
                ) => (
                  <div
                    className={
                      "event-item " +
                      (index % 2 ===
                      0
                        ? "event-navy"
                        : "event-yellow")
                    }
                    key={
                      event.id
                    }
                  >
                    <div className="event-info">
                      <EventInfo
                        event={
                          event
                        }
                      />
                    </div>

                    <div className="event-buttons">
                      <button
                        className="edit-button"
                        onClick={() =>
                          startEditEvent(
                            event
                          )
                        }
                      >
                        編集
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deleteEvent(
                            event.id
                          )
                        }
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>
            TAKAISHI.FC
          </h1>

          <p>
            出欠確認
          </p>
        </div>
      </header>

      <main className="main">
        <div className="top-info-grid">
          <section className="info-box operation-box">
            <h3>
              運用方法
            </h3>

            <div className="info-text">
              自分の名前の「未」ボタンをタップして、
              都合に合わせて予定を登録。
            </div>

            <div className="icon-guide">
              <div>
                ⌚️ → 活動時間
              </div>

              <div>
                ⌛ → 集合時間
              </div>

              <div>
                👕 → ユニ
              </div>
            </div>
          </section>

          <section className="info-box rule-info-box">
            <h3>
              出欠ルール
            </h3>

            <div className="info-text">
              毎週金曜日の17:00までに、
              各週末の予定を登録してください。
            </div>

            <div className="rule-notes">
              ※締切後の○→×は全体に連絡
              <br />
              ※未のまま：500円
              <br />
              ※○→×の連絡なし：2,000円
            </div>
          </section>

          <section className="info-box notice-box">
            <h3>
              全体連絡(誰でも記載可)
            </h3>

            <textarea
              value={
                generalNotice
              }
              placeholder="特記事項など"
              onChange={(e) =>
                setGeneralNotice(
                  e.target.value
                )
              }
              onBlur={(e) => {
                saveGeneralNotice(
                  e.target.value
                );
              }}
            />
          </section>
        </div>

        <div className="home-actions">
          <button
            className="compact-button"
            onClick={() =>
              setPage("compact")
            }
          >
            📸 締切確認
          </button>

          <button
            onClick={() =>
              setPage("login")
            }
          >
            管理者ページ
          </button>
        </div>

        <section className="section">
          <h2>
            出欠
          </h2>

          {players.length ===
          0 ? (
            <p className="empty-message">
              選手がまだ登録されていません。
            </p>
          ) : events.length ===
            0 ? (
            <p className="empty-message">
              予定がまだ登録されていません。
            </p>
          ) : (
            <div className="attendance-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th className="player-name-header">
                      選手
                    </th>

                    {events.map(
                      (
                        event,
                        index
                      ) => (
                        <th
                          key={
                            event.id
                          }
                          className={
                            "event-header " +
                            (index %
                              2 ===
                            0
                              ? "header-navy"
                              : "header-yellow")
                          }
                        >
                          <EventInfo
                            event={
                              event
                            }
                          />
                        </th>
                      )
                    )}

                    <th className="memo-header">
                      備考
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {players.map(
                    (player) => (
                      <tr
                        key={
                          player.id
                        }
                      >
                        <th className="player-name">
                          {
                            player.name
                          }
                        </th>

                        {events.map(
                          (
                            event,
                            index
                          ) => {
                            const item =
                              getAttendance(
                                player.id,
                                event.id
                              );

                            const currentStatus =
                              item?.status ||
                              "未";

                            return (
                              <td
                                key={
                                  event.id
                                }
                                className={
                                  "attendance-cell " +
                                  (index %
                                    2 ===
                                  0
                                    ? "cell-navy"
                                    : "cell-yellow")
                                }
                              >
                                <select
                                  className={
                                    "attendance-select status-" +
                                    currentStatus
                                  }
                                  value={
                                    currentStatus
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateAttendance(
                                      player.id,
                                      event.id,
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                >
                                  {statusOptions.map(
                                    (
                                      status
                                    ) => (
                                      <option
                                        key={
                                          status
                                        }
                                        value={
                                          status
                                        }
                                      >
                                        {
                                          status
                                        }
                                      </option>
                                    )
                                  )}
                                </select>

                                {currentStatus ===
                                  "△" &&
                                  item?.memo && (
                                    <div className="attendance-memo">
                                      {
                                        item.memo
                                      }
                                    </div>
                                  )}
                              </td>
                            );
                          }
                        )}

                        <td className="player-memo-cell">
                          <input
                            type="text"
                            placeholder="備考"
                            value={
                              playerMemos[
                                player.id
                              ] ?? ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target
                                  .value;

                              setPlayerMemos(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [player.id]:
                                    value,
                                })
                              );
                            }}
                            onBlur={(e) => {
                              savePlayerMemo(
                                player.id,
                                e.target
                                  .value
                              );
                            }}
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
