%% AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
-module(shapes).
-export([area/1, describe/1]).
-import(lists, [map/2]).
-record(circle, {r}).

area(#circle{r = R}) -> 3.14159 * R * R.

describe(C) -> io:format("area=~p~n", [area(C)]).
-behaviour(gen_server).
-behaviour(gen_server).
