// opencode-gather-identity.test.mjs — the topic word in a page is the sense's being only when the identity test binds them.
//   node --test opencode-gather-identity.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
const I = await import("./opencode-gather-identity.mjs");

const cat = (i) => `Jaguars hunt deer and capybara in the Amazon rainforest at night. The jaguar swims across rivers and kills prey with a bite to the skull. A female jaguar raises cubs in dense forest near the river. Jaguars live in Brazil, Peru and Mexico, and hunters killed many for their spotted fur. Biologists in Brazil track jaguars with collars across the Pantanal wetland. Jaguars eat caimans, turtles and fish caught in the shallow water. Deforestation in the Amazon destroys the forest the jaguar needs to hunt. ${i % 2 ? "Ranchers in Mexico shoot jaguars that kill cattle." : "Cubs stay with their mother for two years."}`;
const car = () => `The Jaguar XJ sedan has a supercharged engine and leather seats from Coventry. Jaguar Land Rover sells the Jaguar F-Type coupe through dealers in Nashville. The dealer offers financing on a used Jaguar with low mileage and a warranty. Jaguar engineers tuned the engine for the new model year in Coventry. Buyers test drive the Jaguar at the dealership before they sign the lease. The Jaguar F-Type convertible accelerates quickly and has a rear spoiler. Jaguar Land Rover builds engines at a factory in Wolverhampton.`;

test("a dealership's Jaguar shares the word with the cat and is not joined to it", () => {
  const reference = [cat(0), cat(1), cat(2)].join(" ");
  const pages = [{ id: "c1", text: cat(3) + " " + cat(4) }, { id: "c2", text: cat(5) + " " + cat(6) }, { id: "d1", text: car() + " " + car() }, { id: "d2", text: car() + " " + car() }];
  const r = I.sameSense({ reference, pages, topic: "jaguar" });
  assert.equal(r.ok, true);
  assert.equal(r.verdicts.get("d1").same, false, "a dealership is not the cat");
  assert.equal(r.verdicts.get("d2").same, false);
  // a planted corpus this small has too few other beings for the test's chance baseline, so the cat pages are not joined either: not
  // joined is never a verdict of difference (the live check, 2026-10-20: 10 of 54 dolphin pages bound, every one a page about the animal)
  for (const id of ["c1", "c2"]) assert.notEqual(r.verdicts.get(id).verdict, "contradicted");
});

test("a page that never says the word is a gap, and a reference that never says it is no test at all", () => {
  const r = I.sameSense({ reference: cat(0).repeat(3), pages: [{ id: "x", text: "Nothing about it here at all, only weather and roads and the price of bread in the town." }], topic: "jaguar" });
  assert.equal(r.verdicts.get("x").verdict, "gap");
  assert.equal(I.sameSense({ reference: "Roads and bread.", pages: [], topic: "jaguar" }).ok, false);
});
