# Unit 3: ドメインモデル関連図

## 全体構造図

```mermaid
classDiagram
    direction TB

    %% ── 集約: BusinessHour ──
    class BusinessHour {
        <<Aggregate Root>>
        businessHourId: BusinessHourId
        ownerId: OwnerId
        dayOfWeek: DayOfWeek
        startTime: TimeOfDay
        endTime: TimeOfDay
        isBusinessDay: boolean
        +setBusinessHour()
        +setAsClosedDay()
        +setAsBusinessDay()
    }

    %% ── 集約: ClosedDay ──
    class ClosedDay {
        <<Aggregate Root>>
        closedDayId: ClosedDayId
        ownerId: OwnerId
        date: SlotDate
        reason: string
        +create()
        +remove()
    }

    %% ── 集約: DailySlotList ──
    class DailySlotList {
        <<Aggregate Root>>
        ownerId: OwnerId
        date: SlotDate
        version: Version
        slots: List~Slot~
        +addSlot()
        +removeSlot()
        +editSlot()
        +reserveSlot()
        +releaseSlot()
        +generateSlots()
    }

    class Slot {
        <<Entity>>
        slotId: SlotId
        startTime: TimeOfDay
        endTime: TimeOfDay
        durationMinutes: Duration
        status: SlotStatus
        reservationId: ReservationId
        +reserve(reservationId)
        +release(reservationId)
    }

    DailySlotList "1" *-- "0..*" Slot : contains

    %% ── 値オブジェクト ──
    class OwnerId {
        <<Value Object>>
        value: string
    }
    class SlotId {
        <<Value Object>>
        value: string
    }
    class BusinessHourId {
        <<Value Object>>
        value: string
    }
    class ClosedDayId {
        <<Value Object>>
        value: string
    }
    class ReservationId {
        <<Value Object>>
        value: string
    }
    class SlotDate {
        <<Value Object>>
        value: string
    }
    class TimeOfDay {
        <<Value Object>>
        hour: integer
        minute: integer
        +isBefore(other)
        +isAfter(other)
    }
    class TimeRange {
        <<Value Object>>
        startTime: TimeOfDay
        endTime: TimeOfDay
        +overlaps(other)
        +contains(time)
        +durationInMinutes()
    }
    class DayOfWeek {
        <<Value Object>>
        value: enum
    }
    class SlotStatus {
        <<Value Object>>
        AVAILABLE
        BOOKED
    }
    class Duration {
        <<Value Object>>
        minutes: integer
    }
    class Version {
        <<Value Object>>
        value: integer
        +increment()
    }

    %% ── 値オブジェクトの利用関係 ──
    BusinessHour --> OwnerId
    BusinessHour --> BusinessHourId
    BusinessHour --> DayOfWeek
    BusinessHour --> TimeOfDay
    ClosedDay --> OwnerId
    ClosedDay --> ClosedDayId
    ClosedDay --> SlotDate
    DailySlotList --> OwnerId
    DailySlotList --> SlotDate
    DailySlotList --> Version
    Slot --> SlotId
    Slot --> TimeOfDay
    Slot --> Duration
    Slot --> SlotStatus
    Slot --> ReservationId
    TimeRange --> TimeOfDay
```

## ドメインサービスと集約の関係図

```mermaid
flowchart TB
    subgraph Aggregates["集約"]
        BH["BusinessHour\n(集約ルート)"]
        CD["ClosedDay\n(集約ルート)"]
        DSL["DailySlotList\n(集約ルート)"]
        S["Slot\n(エンティティ)"]
        DSL --- S
    end

    subgraph DomainServices["ドメインサービス"]
        SGS["SlotGenerationService"]
        SAS["SlotAvailabilityService"]
        SRS["SlotReservationService"]
    end

    SGS -->|読み取り| BH
    SGS -->|読み取り| CD
    SGS -->|スロット追加| DSL

    SAS -->|読み取り| BH
    SAS -->|読み取り| CD
    SAS -->|読み取り| DSL

    SRS -->|状態変更| DSL
```

## ユニット境界図（コンテキストマップ）

```mermaid
flowchart LR
    subgraph Unit1["Unit 1: 認証"]
        Auth["認証トークン検証"]
    end

    subgraph Unit3["Unit 3: スケジュール・空き枠管理"]
        direction TB
        BH3["BusinessHour 集約"]
        CD3["ClosedDay 集約"]
        DSL3["DailySlotList 集約"]
        SGS3["SlotGenerationService"]
        SAS3["SlotAvailabilityService"]
        SRS3["SlotReservationService"]
    end

    subgraph Unit4["Unit 4: 予約管理"]
        Res["Reservation"]
    end

    Auth -->|"OwnerId 検証\n(依存)"| Unit3

    Unit4 -->|"GET /api/slots/available\n(OHS/PL)"| SAS3
    Unit4 -->|"PUT /api/slots/{slotId}/reserve\n(OHS/PL)"| SRS3
    Unit4 -->|"PUT /api/slots/{slotId}/release\n(OHS/PL)"| SRS3
```

## スロット状態遷移図

```mermaid
stateDiagram-v2
    [*] --> available : スロット作成
    available --> booked : reserve(reservationId)
    booked --> available : release(reservationId)
    available --> [*] : removeSlot
```

## 凡例

| 記号 | 意味 |
|------|------|
| Aggregate Root | 集約ルート。外部からのアクセスポイント |
| Entity | エンティティ。識別子を持つドメインオブジェクト |
| Value Object | 値オブジェクト。不変で等価性で比較されるオブジェクト |
| *-- (実線ダイヤ) | コンポジション（集約内の構成要素） |
| --> (矢印) | 利用関係・依存 |
| OHS/PL | Open Host Service / Published Language パターン（PACT 契約） |
