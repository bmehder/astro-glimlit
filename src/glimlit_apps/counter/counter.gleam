import glimlit_apps/runtime/effect.{type Effect}
import glimlit_apps/runtime/mvu

pub type Model {
  Model(count: Int)
}

pub type Msg {
  UserClickedIncrement
  UserClickedDecrement
  UserClickedReset
}

pub fn init() -> #(Model, List(Effect(Msg))) {
  #(Model(count: 0), [])
}

pub fn update(model: Model, msg: Msg) -> #(Model, List(Effect(Msg))) {
  case msg {
    UserClickedIncrement -> #(Model(count: model.count + 1), [])
    UserClickedDecrement -> #(Model(count: model.count - 1), [])
    UserClickedReset -> #(Model(count: 0), [])
  }
}

@external(javascript, "./view.mjs", "view")
fn view(model: Model, dispatch: fn(Msg) -> Nil, root: effect.Root) -> Nil

pub fn main(root: effect.Root) -> fn() -> Nil {
  mvu.mount(root, init(), update, view)
}
