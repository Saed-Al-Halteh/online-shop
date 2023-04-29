const deleteProduct = async (btn) => {
  console.log("btn -> ", btn);
  const productId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;
  const productElement = btn.closest("article");

  try {
    const result = await fetch(`/admin/product/${productId}`, {
      method: "DELETE",
      headers: {
        "csrf-token": csrf,
      },
    });
    console.log("deleteResponse --> ", result);
    const data = await result.json();
    console.log("data --> ", data);

    // productElement.remove(); // this function is not supported in IE
    productElement.parentNode.removeChild(productElement);
  } catch (err) {
    console.log(err);
  }
};
