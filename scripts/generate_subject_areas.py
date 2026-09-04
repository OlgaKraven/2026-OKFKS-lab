from __future__ import annotations

import csv
import io
import json
import shutil
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "src" / "data" / "subject-areas.json"
LABS_FILE = ROOT / "src" / "data" / "labs.json"
INPUT_ROOT = ROOT / "inputs" / "subject-areas"
SOURCE_ROOT = INPUT_ROOT / "sources"
PACK_ROOT = ROOT / "public" / "inputs" / "subject-areas" / "packs"


PROFILE_VALUES = [
    (
        "Публичные учебные сервисы",
        ["99,95 %", "не более 30 минут", "не более 15 минут", "отклик до 500 мс", "метрики каждую минуту; журнал 90 дней"],
    ),
    (
        "Внутренние рабочие сервисы",
        ["99,5 %", "не более 2 часов", "не более 24 часов", "отклик до 800 мс", "проверка каждые 5 минут; журнал 30 дней"],
    ),
    (
        "Учётные и интеграционные сервисы",
        ["99,9 %", "не более 1 часа", "не более 1 часа", "задержка очереди до 60 с", "контроль очереди каждую минуту; журнал 90 дней"],
    ),
    (
        "Автоматизированные рабочие места",
        ["99,0 % в учебное время", "не более 4 часов", "не более 24 часов", "запуск до 120 с", "состояние каждые 5 минут; журнал 30 дней"],
    ),
    (
        "Сетевые и защитные сервисы",
        ["99,9 %", "не более 45 минут", "конфигурация не старше 24 часов", "задержка до 50 мс", "потоки и отказы ежеминутно; журнал 90 дней"],
    ),
    (
        "Критичные сервисы данных и доступа",
        ["99,99 %", "не более 15 минут", "не более 5 минут", "отклик до 700 мс", "непрерывный контроль; журнал 180 дней"],
    ),
]

CHARACTERISTICS = [
    ("C1", "Целевая готовность", "За отчётный период система «{system}» должна достичь целевой доли штатной работы."),
    ("C2", "Время восстановления", "После отказа системы «{system}» критичная функция должна вернуться в указанный срок."),
    ("C3", "Допустимая потеря данных", "При восстановлении системы «{system}» допускается потеря не более указанного интервала."),
    ("C4", "Предел производительности", "Контрольная операция системы «{system}» считается штатной, пока не превышен порог."),
    ("C5", "Контроль и хранение доказательств", "Для системы «{system}» собираются метрики и журналы с заданной частотой и сроком хранения."),
]

AREAS = [
    ("Электронное расписание", "публикация и просмотр актуального расписания", ["расписание", "учётные записи", "журналы"]),
    ("Личный кабинет студента", "вход и доступ к учебным данным", ["профили", "задания", "оценки"]),
    ("Портал приёмной комиссии", "подача и отслеживание заявления", ["заявления", "документы", "статусы"]),
    ("Электронная библиотека", "поиск и открытие учебных изданий", ["каталог", "лицензии", "история доступа"]),
    ("Портал учебных материалов", "чтение и загрузка файлов курса", ["файлы", "метаданные", "версии"]),
    ("Сервис учебной печати", "приём и печать заданий", ["очередь", "принтеры", "журнал печати"]),
    ("Бронирование аудиторий", "создание и проверка брони", ["аудитории", "брони", "календарь"]),
    ("Служба Service Desk", "регистрация и обработка обращений", ["обращения", "SLA", "комментарии"]),
    ("Учёт компьютерного оборудования", "поиск актива и истории его состояния", ["активы", "перемещения", "инвентаризация"]),
    ("Система заявок на доступ", "согласование и выдача прав", ["заявки", "роли", "согласования"]),
    ("Шина интеграции LMS", "доставка событий между учебными системами", ["события", "очереди", "повторы"]),
    ("Синхронизация реестра студентов", "передача актуальных учётных записей", ["реестр", "пакеты", "контроль целостности"]),
    ("Сервис экспорта отчётов", "формирование и выдача отчёта", ["задания экспорта", "файлы", "статусы"]),
    ("Шлюз учебных уведомлений", "своевременная доставка уведомлений", ["сообщения", "каналы", "повторы"]),
    ("Очередь преобразования документов", "преобразование и сохранение учебного файла", ["очередь", "исходные файлы", "результаты"]),
    ("Компьютерный класс", "вход пользователя и запуск учебной среды", ["рабочие станции", "образы", "профили"]),
    ("Рабочее место преподавателя", "доступ к учебным материалам и ведомостям", ["документы", "профиль", "журналы"]),
    ("Медиааудитория", "запуск презентации и вывод медиа", ["контроллер", "медиафайлы", "проектор"]),
    ("Экзаменационный терминал", "запуск и сдача учебного задания", ["сеансы", "ответы", "журнал контроля"]),
    ("Мобильное учебное рабочее место", "защищённый доступ к учебным сервисам", ["устройство", "профиль", "токены"]),
    ("Шлюз сети кампуса", "маршрутизация разрешённого трафика", ["маршруты", "интерфейсы", "потоки"]),
    ("Сетевой экран учебной сети", "фильтрация и журналирование сетевых потоков", ["правила", "зоны", "журнал потоков"]),
    ("Контроллер Wi-Fi", "подключение авторизованных учебных устройств", ["точки доступа", "клиенты", "сеансы"]),
    ("Сервис удалённого доступа", "защищённое подключение к учебной сети", ["туннели", "сертификаты", "журнал сеансов"]),
    ("Узел мониторинга", "сбор метрик и формирование сигналов", ["метрики", "правила", "уведомления"]),
    ("Файловое хранилище", "чтение и запись учебных файлов", ["файлы", "права", "журнал операций"]),
    ("Сервер резервного копирования", "создание и восстановление копий", ["задания", "копии", "каталог носителей"]),
    ("Служба идентификации", "проверка учётной записи и выдача сеанса", ["учётные записи", "роли", "сеансы"]),
    ("Электронный архив документов", "поиск и выдача неизменённого документа", ["документы", "метаданные", "подписи"]),
    ("Хранилище результатов аттестации", "запись и выдача подтверждённых результатов", ["результаты", "протоколы", "журнал изменений"]),
]

BASE_SYSTEMS = {
    1: "FS-EDU-01", 2: "PRINT-01", 3: "SCHED-01", 4: "PORTAL-EDU", 6: "JOB-01",
    7: "CHECK-API", 8: "PRINT-HUB", 9: "STORAGE-02", 10: "LMS-COLLEGE", 21: "FS2", 22: "CampusBox",
}


def csv_text(header: list[str], rows: list[list[object]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, delimiter=";", lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return stream.getvalue()


def profiles() -> list[dict[str, object]]:
    result = []
    for profile_id, (title, values) in enumerate(PROFILE_VALUES, 1):
        characteristics = [
            {"code": code, "name": name, "value": value, "example": example}
            for (code, name, example), value in zip(CHARACTERISTICS, values, strict=True)
        ]
        result.append({
            "id": profile_id,
            "title": title,
            "variantRange": f"{(profile_id - 1) * 5 + 1:02d}–{profile_id * 5:02d}",
            "characteristics": characteristics,
        })
    return result


def areas() -> list[dict[str, object]]:
    result = []
    for area_id, (title, critical_function, assets) in enumerate(AREAS, 1):
        code = f"SA{area_id:02d}"
        result.append({
            "id": area_id,
            "code": code,
            "title": title,
            "systemCode": f"OKFKS-{code}",
            "description": f"Учебная предметная область «{title}»; все имена и события синтетические.",
            "criticalFunction": critical_function,
            "assets": assets,
            "profileId": (area_id - 1) // 5 + 1,
            "pack": f"inputs/subject-areas/packs/{code}.zip",
        })
    return result


def personalize(value: object, base_system: str | None, system_code: str) -> object:
    if isinstance(value, str):
        return value.replace(base_system, system_code) if base_system else value
    if isinstance(value, list):
        return [personalize(item, base_system, system_code) for item in value]
    if isinstance(value, dict):
        return {key: personalize(item, base_system, system_code) for key, item in value.items()}
    return value


def markdown_source(lab: dict[str, object], area: dict[str, object], profile: dict[str, object]) -> str:
    base_system = BASE_SYSTEMS.get(int(lab["number"]))
    source = personalize(lab["sourceData"], base_system, str(area["systemCode"]))
    situation = personalize(lab["situation"], base_system, str(area["systemCode"]))
    lines = [
        f"# {area['code']} · ЛР {int(lab['number']):02d} · {lab['title']}", "",
        f"**Предметная область:** {area['title']}",
        f"**Система:** `{area['systemCode']}`",
        f"**Критичная функция:** {area['criticalFunction']}",
        f"**Профиль:** {profile['title']} (варианты {profile['variantRange']})", "",
        "## Рабочая ситуация", "", str(situation), "",
        "## Пять характеристик профиля", "",
        "| Код | Характеристика | Значение |", "| --- | --- | --- |",
    ]
    for item in profile["characteristics"]:
        lines.append(f"| {item['code']} | {item['name']} | {item['value']} |")
    lines.extend(["", "## Исходные данные", "", str(source["intro"]), ""])
    for section in source["sections"]:
        lines.extend([f"### {section['title']}", ""])
        for item in section.get("content", []):
            lines.extend([str(item), ""])
        table = section.get("table")
        if table:
            columns = [str(item) for item in table["columns"]]
            lines.extend(["| " + " | ".join(columns) + " |", "| " + " | ".join(["---"] * len(columns)) + " |"])
            for row in table["rows"]:
                lines.append("| " + " | ".join(str(item).replace("|", "\\|").replace("\n", "<br>") for item in row) + " |")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    profile_records = profiles()
    area_records = areas()
    labs = json.loads(LABS_FILE.read_text(encoding="utf-8"))["labs"]
    if len(area_records) != 30 or len({area["title"] for area in area_records}) != 30:
        raise RuntimeError("Ожидаются 30 уникальных предметных областей")
    if len(profile_records) != 6 or any(len(profile["characteristics"]) != 5 for profile in profile_records):
        raise RuntimeError("Ожидаются 6 групп с пятью характеристиками")

    for target in (SOURCE_ROOT, PACK_ROOT):
        resolved = target.resolve()
        if not resolved.is_relative_to(ROOT.resolve()):
            raise RuntimeError(f"Небезопасный путь: {resolved}")
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps({"profiles": profile_records, "subjectAreas": area_records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    INPUT_ROOT.mkdir(parents=True, exist_ok=True)
    (INPUT_ROOT / "subject-areas.csv").write_text(csv_text(
        ["variant", "code", "subject_area", "system_code", "profile", "critical_function", "pack"],
        [[area["id"], area["code"], area["title"], area["systemCode"], area["profileId"], area["criticalFunction"], area["pack"]] for area in area_records],
    ), encoding="utf-8")

    profile_by_id = {profile["id"]: profile for profile in profile_records}
    for area in area_records:
        profile = profile_by_id[area["profileId"]]
        area_root = SOURCE_ROOT / str(area["code"])
        lab_root = area_root / "labs"
        lab_root.mkdir(parents=True)
        readme = (
            f"# {area['code']} · {area['title']}\n\n"
            f"Вариант: **{int(area['id']):02d}**. Система: `{area['systemCode']}`.\n\n"
            "Пакет содержит только данные выбранной предметной области. Используйте этот же вариант во всех 22 лабораторных работах.\n\n"
            "## Состав\n\n"
            "- `system-passport.csv` — паспорт и активы;\n"
            "- `quality-characteristics.csv` — пять общих характеристик группы;\n"
            "- `labs/LR01.md`–`labs/LR22.md` — адаптированные исходные данные каждой работы.\n"
        )
        (area_root / "README.md").write_text(readme, encoding="utf-8")
        (area_root / "system-passport.csv").write_text(csv_text(
            ["field", "value"],
            [["variant", area["id"]], ["code", area["code"]], ["subject_area", area["title"]], ["system_code", area["systemCode"]], ["critical_function", area["criticalFunction"]], ["assets", ", ".join(area["assets"])]],
        ), encoding="utf-8")
        (area_root / "quality-characteristics.csv").write_text(csv_text(
            ["code", "characteristic", "value", "group", "variants"],
            [[item["code"], item["name"], item["value"], profile["title"], profile["variantRange"]] for item in profile["characteristics"]],
        ), encoding="utf-8")
        for lab in labs:
            (lab_root / f"LR{int(lab['number']):02d}.md").write_text(markdown_source(lab, area, profile), encoding="utf-8")

        with zipfile.ZipFile(PACK_ROOT / f"{area['code']}.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file in sorted(area_root.rglob("*")):
                if file.is_file():
                    archive.write(file, arcname=f"{area['code']}/{file.relative_to(area_root).as_posix()}")

    print(f"OK: {len(area_records)} областей, {len(profile_records)} групп, {len(area_records) * len(labs)} файлов исходных данных.")


if __name__ == "__main__":
    main()
