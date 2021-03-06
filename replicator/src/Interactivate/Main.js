import { nofx, fx, batch } from "../../modules/reflex/src/Effect.js"
import { text, doc, body, button } from "../../modules/reflex/src/Element.js"
import { on, className } from "../../modules/reflex/src/Attribute.js"
import { unreachable } from "../../modules/reflex/src/Basics.js"
import * as IPFS from "../Service/IPFS.js"

import * as Main from "./Main/Main.js"
import * as Data from "./Main/Data.js"
import * as Inbox from "./Main/Inbox.js"
import * as Effect from "./Main/Effect.js"
import * as Decoder from "./Main/Decoder.js"
import * as Notebook from "./Notebook.js"

/**
 *
 * @param {{state?:Main.Model, url:URL}} options
 * @returns {Main.State}
 */
export const init = ({ state, url }) => {
  if (state) {
    return [state, nofx]
  } else {
    const [notebook, open] = Notebook.open(url)

    return [
      Data.init(notebook),
      batch(fx(IPFS.start()), open.map(Inbox.notebook)),
    ]
  }
}

/**
 * @param {Main.Message} message
 * @param {Main.Model} state
 * @returns {Main.State}
 */
export const update = (message, state) => {
  switch (message.tag) {
    case "notebook": {
      const [notebook, fx] = Notebook.update(
        message.value,
        Data.notebook(state)
      )
      return [Data.updateNotebook(state, notebook), fx.map(Inbox.notebook)]
    }
    case "save": {
      const url = Data.toURL(state)
      const content = Data.toText(state)
      const effect =
        url && Data.isOwner(state)
          ? fx(Effect.save(url, content), Inbox.onSaved, Inbox.onSaveError)
          : fx(
              Effect.saveAs(content, url),
              Inbox.onPublished,
              Inbox.onSaveError
            )
      return [Data.save(state), effect]
    }
    case "saved": {
      return [Data.saved(state), nofx]
    }
    case "published": {
      const url = message.value
      return [
        Data.published(url, state),
        fx(
          Effect.navigate(
            new URL(`/${url.hostname}${url.pathname}`, location.href)
          )
        ),
      ]
    }
    case "saveError": {
      return [Data.saveFailed(message.value, state), nofx]
    }
    case "route": {
      return route(message.value, state)
    }
    default: {
      return unreachable(message)
    }
  }
}

/**
 *
 * @param {Main.Route} message
 * @param {Main.Model} state
 * @returns {Main.State}
 */
const route = (message, state) => {
  switch (message.tag) {
    case "navigate": {
      return init({ url: message.value })
    }
    case "navigated": {
      return [state, nofx]
    }
    case "load": {
      return [state, fx(Effect.load(message.value))]
    }
    default: {
      return unreachable(message)
    }
  }
}

/**
 * @param {Main.Model} state
 * @returns {Main.View}
 */
export const view = (state) =>
  doc(
    "Interactive Notebook",
    body(
      [className("sans-serif")],
      [
        Notebook.view(Data.notebook(state)).map(Inbox.notebook),
        viewSaveButton(state),
      ]
    )
  )

/**
 * @param {Main.Model} state
 */
const viewSaveButton = (state) =>
  button(
    [
      className(`fixed bottom-2 right-2 publish ${Data.status(state)}`),
      on("click", Decoder.save),
    ],
    [Data.isOwner(state) ? text("Save") : text("Fork")]
  )

export const { onInternalURLRequest, onExternalURLRequest, onURLChange } = Inbox
