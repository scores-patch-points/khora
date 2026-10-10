# AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
defmodule Shapes.Circle do
  alias Shapes.Util
  import Enum, only: [map: 2]
  use GenServer
  require Logger

  defstruct r: 1.0

  def area(%__MODULE__{r: r}), do: 3.14159 * r * r

  defp helper(x), do: x * 2

  def describe(c) do
    "area=#{area(c)}" |> IO.puts()
  end
end
