(* AUTHORED fixture (model-written for the gold-extractor self-test; not natural data) *)
open Printf
module M = Map.Make (String)

type shape = Circle of float | Square of float

class virtual base_shape = object
  method virtual area : float
end

class circle r = object
  inherit base_shape
  method area = 3.14159 *. r *. r
end

let area = function
  | Circle r -> 3.14159 *. r *. r
  | Square s -> s *. s

let describe s = sprintf "area=%f" (area s)

let () = print_endline (describe (Circle 2.0))
