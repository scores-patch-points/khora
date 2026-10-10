// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
import React from "react";
import { Button } from "./button";

interface Props { label: string }

class Panel extends React.Component<Props> {
  render() {
    return <div className="panel">{this.props.label}</div>;
  }
}

function App(props: Props) {
  return <Button onClick={() => console.log("hi")}>{props.label}</Button>;
}

export default App;
