window.addEventListener('DOMContentLoaded', () => {
  const productNameInput = document.getElementById('productName');
  const productPriceInput = document.getElementById('productPrice');
  const productDescriptionInput = document.getElementById('productDescription');
  const productCategoryInput = document.getElementById('productCategory');
  const productImageInput = document.getElementById('productImage');
  const fileSelectedMessage = document.getElementById('fileSelectedMessage');
  const imagePreview = document.getElementById('imagePreview');
  const addBtn = document.getElementById('addbtn');
  const updateBtn = document.getElementById('updatebtn');
  const noProductsMessage = document.getElementById('no-products-message');
  const noSearchResults = document.getElementById('no-search-results');
  const productListElement = document.getElementById('productList');
  const searchInput = document.getElementById('searchInput');

  const STORAGE_KEY = 'allProducts';
  let productList = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let currentEditIndex = null;

  const touched = {
    productName: false,
    productPrice: false,
    productCategory: false,
    productImage: false,
    productDescription: false
  };

  function saveProducts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(productList));
    } catch {
      Swal.fire('Error', 'Failed to save product.', 'error');
    }
  }

  function hasData(input) {
    return input.id === 'productImage' ? !!input.files[0] : input.value.trim() !== '';
  }

  function validateInput(input, showFeedback = true) {
    if (showFeedback) touched[input.id] = true;
    let isValid = true;
    const feedback = input.closest('.mb-3').querySelector('.invalid-feedback');

    switch (input.id) {
      case 'productName':
        isValid = /^[A-Z][a-zA-Z\s]{2,14}$/.test(input.value.trim());
        break;
      case 'productPrice':
        const price = parseFloat(input.value);
        isValid = !isNaN(price) && price >= 600 && price <= 60000;
        break;
      case 'productCategory':
        isValid = !!input.value;
        break;
      case 'productImage':
        if (input.files[0]) {
          const f = input.files[0];
          isValid = ['image/jpeg','image/png','image/webp'].includes(f.type) && f.size <= 2*1024*1024;
          fileSelectedMessage.textContent = isValid ? f.name : 'Invalid file!';
          fileSelectedMessage.classList.toggle('text-danger', !isValid);
          if (isValid) {
            const reader = new FileReader();
            reader.onload = e => {
              imagePreview.src = e.target.result;
              imagePreview.classList.remove('d-none');
            };
            reader.readAsDataURL(f);
          } else {
            imagePreview.classList.add('d-none');
          }
        } else {
          isValid = currentEditIndex !== null;
        }
        break;
      case 'productDescription':
        isValid = input.value.trim().length <= 255;
        break;
    }

    if (touched[input.id] && showFeedback) {
      input.classList.toggle('is-invalid', !isValid);
      input.classList.toggle('is-valid', isValid);
      if (feedback) feedback.style.display = isValid ? 'none' : 'block';
    }
    return isValid;
  }

  function validateForm(showFeedback = false) {
    return [
      validateInput(productNameInput, showFeedback),
      validateInput(productPriceInput, showFeedback),
      validateInput(productCategoryInput, showFeedback),
      validateInput(productImageInput, showFeedback),
      validateInput(productDescriptionInput, showFeedback)
    ].every(Boolean);
  }

  function updateAddButtonState() {
    const dataPresent = 
      hasData(productNameInput) &&
      hasData(productPriceInput) &&
      hasData(productCategoryInput) &&
      (currentEditIndex === null ? hasData(productImageInput) : true);
    const allValid = validateForm();
    addBtn.disabled = !(dataPresent && allValid);
    updateBtn.disabled = addBtn.disabled;
  }

  function clearForm() {
    [productNameInput, productPriceInput, productCategoryInput, productImageInput, productDescriptionInput].forEach(i => {
      i.value = '';
      i.classList.remove('is-valid','is-invalid');
      const f = i.closest('.mb-3').querySelector('.invalid-feedback');
      if (f) f.style.display = 'none';
    });
    fileSelectedMessage.textContent = 'No image selected.';
    imagePreview.src = '';
    imagePreview.classList.add('d-none');
    searchInput.value = '';
    addBtn.classList.remove('d-none');
    updateBtn.classList.add('d-none');
    addBtn.disabled = true;
    currentEditIndex = null;
    Object.keys(touched).forEach(k => touched[k] = false);
  }

  function displayProducts(products = productList) {
    productListElement.innerHTML = '';
    if (products.length === 0) {
      noProductsMessage.style.display = searchInput.value.trim() ? 'none' : 'block';
      noSearchResults.style.display = searchInput.value.trim() ? 'block' : 'none';
      return;
    }
    noProductsMessage.style.display = 'none';
    noSearchResults.style.display = 'none';

    const term = searchInput.value.trim().toLowerCase();
    const regex = new RegExp(term, 'gi');

    products.forEach((p, idx) => {
      const name = term ? p.name.replace(regex, x => `<span class="bg-warning">${x}</span>`) : p.name;
      const desc = term ? (p.description||'').replace(regex, x => `<span class="bg-warning">${x}</span>`) : (p.description|| '');
      const cat = term ? p.category.replace(regex, x => `<span class="bg-warning">${x}</span>`) : p.category;

      const col = document.createElement('div');
      col.className = 'col-md-4';
      col.innerHTML = `
        <div class="card shadow product-card">
          <img src="${p.image}" class="card-img-top" alt="${p.name}">
          <div class="card-body">
            <h5 class="card-title">${name}</h5>
            <p class="card-text text-muted">${desc}</p>
            <p><strong>Price:</strong> ${p.price} EGP</p>
            <p><strong>Category:</strong> ${cat}</p>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-warning flex-grow-1" onclick="editProduct(${idx})"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn btn-sm btn-danger flex-grow-1" onclick="deleteProduct(${idx})"><i class="fas fa-trash"> </i> Delete</button>
            </div>
          </div>
        </div>`;
      productListElement.appendChild(col);
    });
  }

  window.searchProducts = input => displayProducts(productList.filter(p =>
    p.name.toLowerCase().includes(input.value.toLowerCase()) ||
    (p.description||'').toLowerCase().includes(input.value.toLowerCase()) ||
    p.category.toLowerCase().includes(input.value.toLowerCase())
  ));

  window.sortProducts = order => {
    const sorted = [...productList].sort((a,b) =>
      order === 'asc' ? a.price - b.price : b.price - a.price
    );
    displayProducts(sorted);
  };

  window.editProduct = idx => {
    const p = productList[idx];
    if (!p) return Swal.fire('Error', 'Product not found', 'error');
    currentEditIndex = idx;
    productNameInput.value = p.name;
    productPriceInput.value = p.price;
    productCategoryInput.value = p.category;
    productDescriptionInput.value = p.description;
    productImageInput.value = '';
    fileSelectedMessage.textContent = 'No image selected (using old).';
    imagePreview.src = p.image;
    imagePreview.classList.remove('d-none');
    touched.productImage = true;
    validateForm();
    addBtn.classList.add('d-none');
    updateBtn.classList.remove('d-none');
    updateAddButtonState();
  };

  window.deleteProduct = idx => {
    Swal.fire({
      title: 'Confirm delete?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete'
    }).then(res => {
      if (res.isConfirmed) {
        productList.splice(idx,1);
        saveProducts();
        displayProducts();
        Swal.fire('Deleted!', '', 'success');
      }
    });
  };

  addBtn.addEventListener('click', () => {
    if (!validateForm(true)) return Swal.fire('Error','Fill correctly','error');
    const file = productImageInput.files[0];
    if (!file) return Swal.fire('Error','Image required','error');
    const fr = new FileReader();
    fr.onload = e => {
      productList.push({
        name: productNameInput.value.trim(),
        price: parseFloat(productPriceInput.value),
        category: productCategoryInput.value,
        description: productDescriptionInput.value.trim(),
        image: e.target.result
      });
      saveProducts();
      clearForm();
      displayProducts();
      Swal.fire('Added!','','success');
    };
    fr.readAsDataURL(file);
  });

  updateBtn.addEventListener('click', () => {
    if (!validateForm(true)) return Swal.fire('Error','Fill correctly','error');
    if (currentEditIndex === null) return;
    const done = imgSrc => {
      productList[currentEditIndex] = {
        name: productNameInput.value.trim(),
        price: parseFloat(productPriceInput.value),
        category: productCategoryInput.value,
        description: productDescriptionInput.value.trim(),
        image: imgSrc
      };
      saveProducts();
      clearForm();
      displayProducts();
      Swal.fire('Updated!','','success');
    };
    const file = productImageInput.files[0];
    if (file) {
      const fr = new FileReader();
      fr.onload = e => done(e.target.result);
      fr.readAsDataURL(file);
    } else {
      done(productList[currentEditIndex].image);
    }
  });

  [productNameInput,productPriceInput,productCategoryInput,productImageInput,productDescriptionInput].forEach(i => {
    i.addEventListener('input', () => { validateInput(i); updateAddButtonState(); });
    i.addEventListener('change', () => { validateInput(i); updateAddButtonState(); });
  });

  searchInput.addEventListener('input', () => window.searchProducts(searchInput));

  displayProducts();
});
