// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
`include "defs.vh"

module adder (input [3:0] a, input [3:0] b, output [4:0] sum);
  assign sum = a + b;
endmodule

module top;
  reg [3:0] x, y;
  wire [4:0] s;
  adder u1 (.a(x), .b(y), .sum(s));
  initial begin
    x = 4'd1;
    y = 4'd2;
    $display("sum=%d", s);
  end
endmodule
