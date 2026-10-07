import ctypes
from ctypes import wintypes
import csv
import json
import math
import os
import subprocess

I32 = ctypes.c_int32
U32 = ctypes.c_uint32
U8 = ctypes.c_ubyte
I8 = ctypes.c_int8
I16 = ctypes.c_int16
F32 = ctypes.c_float
F64 = ctypes.c_double
B = ctypes.c_bool

class Vec3(ctypes.Structure):
    _pack_ = 4
    _fields_ = [("x", F64), ("y", F64), ("z", F64)]

class Wheel(ctypes.Structure):
    _pack_ = 4
    _fields_ = [
        ("suspension", F64), ("rideHeight", F64), ("suspForce", F64), ("brakeTemp", F64), ("brakePressure", F64),
        ("rotation", F64), ("lateralPatchVel", F64), ("longitudinalPatchVel", F64), ("lateralGroundVel", F64), ("longitudinalGroundVel", F64),
        ("camber", F64), ("lateralForce", F64), ("longitudinalForce", F64), ("tireLoad", F64), ("gripFraction", F64), ("pressure", F64),
        ("temperature", F64 * 3), ("wear", F64), ("terrainName", ctypes.c_char * 16), ("surfaceType", U8), ("flat", B), ("detached", B), ("staticRadius", U8),
        ("verticalDeflection", F64), ("wheelYLocation", F64), ("toe", F64), ("carcassTemp", F64), ("innerLayerTemp", F64 * 3), ("expansion", U8 * 24),
    ]

class VehicleTelemetry(ctypes.Structure):
    _pack_ = 4
    _fields_ = [
        ("id", I32), ("deltaTime", F64), ("elapsedTime", F64), ("lapNumber", I32), ("lapStartET", F64),
        ("vehicleName", ctypes.c_char * 64), ("trackName", ctypes.c_char * 64),
        ("pos", Vec3), ("localVel", Vec3), ("localAccel", Vec3), ("ori", Vec3 * 3), ("localRot", Vec3), ("localRotAccel", Vec3),
        ("gear", I32), ("engineRPM", F64), ("engineWaterTemp", F64), ("engineOilTemp", F64), ("clutchRPM", F64),
        ("unfiltered", F64 * 4), ("filtered", F64 * 4), ("steeringShaftTorque", F64), ("front3rdDeflection", F64), ("rear3rdDeflection", F64),
        ("frontWingHeight", F64), ("frontRideHeight", F64), ("rearRideHeight", F64), ("drag", F64), ("frontDownforce", F64), ("rearDownforce", F64),
        ("fuel", F64), ("engineMaxRPM", F64), ("scheduledStops", U8), ("overheating", B), ("detached", B), ("headlights", B), ("dentSeverity", U8 * 8),
        ("lastImpactET", F64), ("lastImpactMagnitude", F64), ("lastImpactPos", Vec3), ("engineTorque", F64), ("currentSector", I32),
        ("speedLimiter", U8), ("maxGears", U8), ("frontCompoundIndex", U8), ("rearCompoundIndex", U8), ("fuelCapacity", F64),
        ("frontFlap", U8), ("rearFlap", U8), ("rearFlapLegal", U8), ("ignition", U8),
        ("frontCompoundName", ctypes.c_char * 18), ("rearCompoundName", ctypes.c_char * 18), ("speedLimiterAvailable", U8), ("antiStall", U8), ("unused", U8 * 2),
        ("visualWheelRange", F32), ("rearBrakeBias", F64), ("turboBoost", F64), ("physicsToGraphicsOffset", F32 * 3), ("physicalWheelRange", F32),
        ("batteryCharge", F64), ("electricTorque", F64), ("electricRPM", F64), ("electricTemp", F64), ("electricWaterTemp", F64), ("electricState", U8), ("expansion", U8 * 111), ("wheels", Wheel * 4),
    ]

class Telemetry(ctypes.Structure):
    _pack_ = 4
    _fields_ = [("bytesUpdatedHint", I32), ("numVehicles", I32), ("vehicles", VehicleTelemetry * 128)]

class ScoringInfo(ctypes.Structure):
    _pack_ = 4
    _fields_ = [
        ("trackName", ctypes.c_char * 64), ("session", I32), ("currentET", F64), ("endET", F64), ("maxLaps", I32), ("lapDist", F64), ("pointer1", U8 * 8), ("numVehicles", I32),
        ("gamePhase", U8), ("yellowFlagState", I8), ("sectorFlag", I8 * 3), ("startLight", U8), ("numRedLights", U8), ("inRealtime", B), ("playerName", ctypes.c_char * 32), ("plrFileName", ctypes.c_char * 64),
        ("darkCloud", F64), ("raining", F64), ("ambientTemp", F64), ("trackTemp", F64), ("wind", Vec3), ("minPathWetness", F64), ("maxPathWetness", F64),
        ("gameMode", U8), ("passwordProtected", B), ("serverPort", ctypes.c_uint16), ("serverPublicIP", U32), ("maxPlayers", I32), ("serverName", ctypes.c_char * 32), ("startET", F32), ("avgPathWetness", F64), ("expansion", U8 * 200), ("pointer2", U8 * 8),
    ]

class VehicleScoring(ctypes.Structure):
    _pack_ = 4
    _fields_ = [
        ("id", I32), ("driverName", ctypes.c_char * 32), ("vehicleName", ctypes.c_char * 64), ("totalLaps", I16), ("sector", I8), ("finishStatus", I8),
        ("lapDist", F64), ("pathLateral", F64), ("trackEdge", F64), ("bestSector1", F64), ("bestSector2", F64), ("bestLapTime", F64), ("lastSector1", F64), ("lastSector2", F64), ("lastLapTime", F64), ("curSector1", F64), ("curSector2", F64),
        ("numPitstops", I16), ("numPenalties", I16), ("isPlayer", B), ("control", I8), ("inPits", B), ("place", U8), ("vehicleClass", ctypes.c_char * 32),
        ("timeBehindNext", F64), ("lapsBehindNext", I32), ("timeBehindLeader", F64), ("lapsBehindLeader", I32), ("lapStartET", F64), ("pos", Vec3), ("localVel", Vec3), ("localAccel", Vec3), ("ori", Vec3 * 3), ("localRot", Vec3), ("localRotAccel", Vec3),
        ("headlights", U8), ("pitState", U8), ("serverScored", U8), ("individualPhase", U8), ("qualification", I32), ("timeIntoLap", F64), ("estimatedLapTime", F64), ("pitGroup", ctypes.c_char * 24),
        ("flag", U8), ("underYellow", B), ("countLapFlag", U8), ("inGarageStall", B), ("upgradePack", U8 * 16), ("pitLapDist", F32), ("bestLapSector1", F32), ("bestLapSector2", F32), ("expansion", U8 * 48),
    ]

class Scoring(ctypes.Structure):
    _pack_ = 4
    _fields_ = [("bytesUpdatedHint", I32), ("info", ScoringInfo), ("vehicles", VehicleScoring * 128)]

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.OpenFileMappingW.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.LPCWSTR]
kernel32.OpenFileMappingW.restype = wintypes.HANDLE
kernel32.MapViewOfFile.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.DWORD, wintypes.DWORD, ctypes.c_size_t]
kernel32.MapViewOfFile.restype = ctypes.c_void_p
kernel32.UnmapViewOfFile.argtypes = [ctypes.c_void_p]
kernel32.CloseHandle.argtypes = [wintypes.HANDLE]

def text(value):
    return bytes(value).split(b"\0", 1)[0].decode("utf-8", "replace").strip()

def read_map(name, structure):
    h = kernel32.OpenFileMappingW(4, False, name)
    if not h: raise OSError(ctypes.get_last_error(), name)
    view = kernel32.MapViewOfFile(h, 4, 0, 0, 0)
    if not view:
        kernel32.CloseHandle(h); raise OSError(ctypes.get_last_error(), name)
    try:
        before = (U32.from_address(view).value, U32.from_address(view + 4).value)
        raw = ctypes.string_at(view + 8, ctypes.sizeof(structure))
        after = (U32.from_address(view).value, U32.from_address(view + 4).value)
        if not (before[0] == before[1] == after[0] == after[1]): raise RuntimeError(f"torn frame {before} {after}")
        return structure.from_buffer_copy(raw)
    finally:
        kernel32.UnmapViewOfFile(view); kernel32.CloseHandle(h)

def normalized(value):
    return " ".join(str(value or "").casefold().split())


def bounded_count(value):
    return value if 0 <= value <= 128 else 0


def dedicated_pid():
    configured = os.environ.get("RF2_DEDICATED_PID", "").strip()
    if configured.isdecimal():
        return configured
    result = subprocess.run(
        ["tasklist.exe", "/FO", "CSV", "/NH"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=2,
        check=True,
    )
    pids = [row[1] for row in csv.reader(result.stdout.splitlines()) if len(row) >= 2 and row[0].casefold() == "rfactor2 dedicated.exe"]
    if len(pids) != 1 or not pids[0].isdecimal():
        raise RuntimeError("dedicated_pid_unavailable")
    return pids[0]


def finite(value, minimum=None):
    number = float(value)
    if not math.isfinite(number) or (minimum is not None and number < minimum):
        return None
    return number


def main():
    try:
        pid = dedicated_pid()
        telemetry = read_map("$rFactor2SMMP_Telemetry$" + pid, Telemetry)
        scoring = read_map("$rFactor2SMMP_Scoring$" + pid, Scoring)
        telemetry_by_slot = {}
        for vehicle in telemetry.vehicles[:bounded_count(telemetry.numVehicles)]:
            if vehicle.id in telemetry_by_slot:
                raise RuntimeError("duplicate_telemetry_slot")
            telemetry_by_slot[vehicle.id] = vehicle
        scoring_by_slot = {}
        for vehicle in scoring.vehicles[:bounded_count(scoring.info.numVehicles)]:
            if vehicle.id in scoring_by_slot:
                raise RuntimeError("duplicate_scoring_slot")
            scoring_by_slot[vehicle.id] = vehicle

        vehicles = []
        for slot_id in sorted(set(telemetry_by_slot).intersection(scoring_by_slot)):
            telem = telemetry_by_slot[slot_id]
            score = scoring_by_slot[slot_id]
            driver_name = text(score.driverName)
            vehicle_name = text(score.vehicleName)
            car_class = text(score.vehicleClass)
            telemetry_vehicle_name = text(telem.vehicleName)
            if not driver_name or not vehicle_name or not car_class or normalized(vehicle_name) != normalized(telemetry_vehicle_name):
                continue
            fuel_liters = finite(telem.fuel, 0)
            fuel_capacity_liters = finite(telem.fuelCapacity, 0)
            wear = [finite(wheel.wear, 0) for wheel in telem.wheels]
            vehicles.append({
                "slotID": int(slot_id),
                "mID": int(score.id),
                "control": int(score.control),
                "position": int(score.place),
                "lapsCompleted": int(score.totalLaps),
                "qualification": int(score.qualification),
                "bestLapTime": finite(score.bestLapTime, 0),
                "lastLapTime": finite(score.lastLapTime, 0),
                "lastSectorTime1": finite(score.lastSector1, 0),
                "lastSectorTime2": finite(score.lastSector2, 0),
                "timeBehindNext": finite(score.timeBehindNext, 0),
                "lapsBehindNext": int(score.lapsBehindNext),
                "timeBehindLeader": finite(score.timeBehindLeader, 0),
                "lapsBehindLeader": int(score.lapsBehindLeader),
                "lapDistance": finite(score.lapDist, 0),
                "pitstops": int(score.numPitstops),
                "pitting": bool(score.inPits),
                "pitState": int(score.pitState),
                "driverName": driver_name,
                "vehicleName": vehicle_name,
                "carClass": car_class,
                "player": bool(score.isPlayer),
                "fuelLiters": fuel_liters,
                "fuelCapacityLiters": fuel_capacity_liters if fuel_capacity_liters and fuel_capacity_liters > 0 else None,
                "frontTyreCompound": text(telem.frontCompoundName) or None,
                "rearTyreCompound": text(telem.rearCompoundName) or None,
                "wheelWearFractions": wear if all(value is not None and value <= 1 for value in wear) else None,
            })
        print(json.dumps({
            "stable": True,
            "dedicatedPid": int(pid),
            "trackName": text(scoring.info.trackName),
            "scoringVehicleCount": bounded_count(scoring.info.numVehicles),
            "telemetryVehicleCount": bounded_count(telemetry.numVehicles),
            "matchedVehicleCount": len(vehicles),
            "vehicles": vehicles,
        }, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"stable": False, "reason": type(error).__name__, "vehicles": []}))


if __name__ == "__main__":
    main()
