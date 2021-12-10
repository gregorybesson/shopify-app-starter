import { get, put, post, del, getUrl, getHeaders, sleep } from "../query";
import _ from "lodash";

/**
 *  GET /admin/api/2020-01/themes/{theme_id}/assets.json
    Retrieves a list of assets for a theme

    GET /admin/api/2020-01/themes/{theme_id}/assets.json?asset[key]=templates/index.liquid
    Retrieves a single asset for a theme

    PUT /admin/api/2020-01/themes/{theme_id}/assets.json
    Creates or updates an asset for a theme

    DELETE /admin/api/2020-01/themes/{theme_id}/assets.json?asset[key]=assets/bg-body.gif
    Deletes an asset from a theme
 */

export const getSections = async () => {
  const cmsSections = {};
  const activeTheme = await getActiveTheme();
  const resultAssets = await get(
    `/themes/${activeTheme.id}/assets.json`
  );
  const sections = resultAssets.data.assets.filter(
    (asset) => asset.key.startsWith("sections/") && !asset.key.includes("-lc-")
  );
  for (const section of sections) {
    // I wait 1s between each call
    await sleep(1000)
    let liquid = null;
    try {
      liquid = await getAsset(section.key);
    } catch (e) {
      console.log("error", e);
    }
    if (liquid) {
      const regex = /({% schema %})([^]*.+[^]*)({% endschema %})/gim;
      //const regex = new RegExp(`\{\% schema \%\}((.|\n)*)?\{\% endschema \%\}`, "gm");
      let m;
      let schema = {};
      while ((m = regex.exec(liquid.asset.value)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          if (groupIndex === 0) {
            return;
          }
          if (groupIndex === 2) {
            let json = JSON.parse(match);
            //delete json.presets;
            schema = json;
            let category = _.get(schema, "presets[0].category.en", null);
            if (!category) {
              category = _.get(schema, "presets[0].category", null);
            }
            if (category) {
              if (!_.get(cmsSections, category, null)) {
                cmsSections[category] = [];
              }
              const presets = schema.presets[0];
              presets["id"] = section.key
                .split("/")
                .pop()
                .replace(".liquid", "");
              cmsSections[category].push(presets);
            }
          }
        });
      }

      //console.log('schema', _.get(schema, 'presets'));
    }
  }
  //console.log('finished', cmsSections);

  return cmsSections;
};

export const getActiveTheme = async () => {
  const resultThemes = await get(`/themes.json`);

  return resultThemes.data.themes.find((theme) => theme.role === "main");
};

//GET /admin/api/2020-04/themes/#{theme_id}/assets.json?asset[key]=assets/bg-body.gif
export const getAsset = async (pathAsset) => {
  const activeTheme = await getActiveTheme();
  const urlAsset = `/themes/${activeTheme.id}/assets.json?asset[key]=${pathAsset}`;
  //console.log('activeTheme', activeTheme, 'url', urlAsset);

  let asset = null;
  try {
    const result = await get(urlAsset);
    if (result) {
      asset = result.data;
    }
  } catch (e) {}

  return asset;
};

export const setAsset = async (path, value) => {
  const activeTheme = await getActiveTheme();

  let success = true;
  try {
    await put(`/themes/${activeTheme.id}/assets.json`, {
      asset: {
        key: path,
        value: value,
      },
    });
  } catch (e) {
    console.log("error", e);

    success = false;
  }

  return success;
};

export const deleteAsset = async (path) => {
  const activeTheme = await getActiveTheme();

  let success = true;
  try {
    await del(
      `/themes/${activeTheme.id}/assets.json?asset[key]=${path}`
    );
  } catch (e) {
    console.log("error", e);

    success = false;
  }

  return success;
};

/**
 * Modify an existing liquid file by appending content
 * @param {*} pathFile
 */
export const appendToLiquid = async (pathFile = "layout/theme.liquid", str) => {
  const liquid = await getAsset(pathFile);

  let liquidValue = liquid.asset.value;
  liquidValue = `${liquidValue}\n${str}\n`;

  //modify the layout
  await setAsset(pathFile, liquidValue);

  return true;
};

/**
 * Modify an existing liquid file by removing content
 * @param {*} pathFile
 */
export const removeFromLiquid = async (
  pathFile = "layout/theme.liquid",
  str
) => {
  // Get the liquid file
  const liquid = await getAsset(pathFile);

  if (liquid) {
    let liquidValue = liquid.asset.value;
    //const regex = /.*cp-newsletter-lc-24850.*\n/g;
    const regex = new RegExp(`.*${str}.*\n`, "g");
    liquidValue = liquidValue.replace(regex, "");

    //modify the liquid file
    await setAsset(pathFile, liquidValue);
  }

  return true;
};

/**
 * Modify an existing liquid file by swapping 2 lines based on keywords
 * @param {*} pathFile
 */
export const swapContentInLiquid = async (pathFile, from, to, order) => {
  // Get the liquid file
  const liquid = await getAsset(pathFile);

  if (liquid) {
    //console.log("from", from, "to", to, "order", order);

    let liquidValue = liquid.asset.value;
    //const regex = /.*cp-newsletter-lc-24850.*\n/g;
    const regexFrom = new RegExp(".*" + from + ".*", "g");
    const regexTo = new RegExp(".*" + to + ".*", "g");
    let m;
    let strToSwap = "";

    while ((m = regexFrom.exec(liquidValue)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regexFrom.lastIndex) {
        regexFrom.lastIndex++;
      }

      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 0) {
          strToSwap = match;
          //console.log("strToSwap", strToSwap);
        }
      });
    }

    //console.log("BEFORE liquidValue", liquidValue, "strToSwap", strToSwap);

    if (order === "backward") {
      liquidValue = liquidValue
        .replace(regexFrom, "")
        .replace(regexTo, function (x) {
          return `${strToSwap}\n${x}`;
        });
    } else {
      liquidValue = liquidValue
        .replace(regexFrom, "")
        .replace(regexTo, function (x) {
          return `${x}\n${strToSwap}`;
        });
    }

    //console.log("AFTER liquidValue", liquidValue, "strToSwap", strToSwap);

    //modify the liquid file
    await setAsset(pathFile, liquidValue);
  }

  return true;
};

/**
 *
 * Duplicate an asset
 * @param {*} source
 */
export const duplicateAsset = async (
  source = "layout/theme.liquid",
  destination
) => {
  const activeTheme = await getActiveTheme();
  let liquid = null;
  try {
    liquid = await getAsset(source);
    //console.log('liquid', liquid);
  } catch (e) {
    console.log("error", e);
  }
  if (liquid) {
    const regex = /({% schema %})([^]*.+[^]*)({% endschema %})/gim;
    let m;
    let schema = "";
    while ((m = regex.exec(liquid.asset.value)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 0) {
          return;
        }
        if (groupIndex === 2) {
          let json = JSON.parse(match);
          delete json.presets;
          match = JSON.stringify(json);
        }
        schema = `${schema}${match}`;
      });
    }
    const liquidValue = liquid.asset.value.replace(regex, schema);
    console.log("liquidValue", liquidValue, "destination", destination);
    await setAsset(destination, liquidValue);
  }

  return true;
};
