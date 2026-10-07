import test from "node:test";
import assert from "node:assert/strict";
import { tyreConsumedThisLap } from "../app/_services/live-tyre-selected-lap.mjs";

test("consommation compare seulement le tour précédent du même relais", () => {
 const a={relay:1,lap:4,wearFrontLeft:71.3,wearFrontRight:72,wearRearLeft:70,wearRearRight:69};
 const b={relay:1,lap:5,wearFrontLeft:68.6,wearFrontRight:70,wearRearLeft:68,wearRearRight:67};
 const c={relay:2,lap:6,wearFrontLeft:100,wearFrontRight:100,wearRearLeft:100,wearRearRight:100};
 assert.deepEqual(tyreConsumedThisLap([a,b,c],b),[2.7,2,2,2]);
 assert.deepEqual(tyreConsumedThisLap([a,b,c],c),[null,null,null,null]);
});
