class State {
  //constructor method
  constructor() {
    this.state = [
      {
        id: "",
        state: "",
        data: [],
      },
    ];
  }

  //main method
  createState(id) {
    let indexUnique = this.state.findIndex((obj) => obj.id === id);
    if (indexUnique === -1) {
      this.state.push({
        id: id,
        state: "start",
        data: [],
      });
    }
  }

  getIndex(id) {
    let index = this.state.findIndex((obj) => obj.id === id);
    return index;
  }

  getState(id) {
    return this.state[this.getIndex(id)] !== undefined
      ? this.state[this.getIndex(id)]
      : false;
  }
}

module.exports = State;
