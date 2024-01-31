
import fetchData from '/js/api.js';
import { API_URL } from '/js/api.js';
import { showAlertAndRedirect } from './extension.js';
import { removeAscent } from './extension.js';
import { loadCategories, selectedValue } from './Categories/categoriesModule.js';
import { renderOrdersDisplay } from './Orders/ordersModule.js';
import { renderUserDisplay } from './Users/userModule.js';


document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Sử dụng Promise.all để gọi đồng thời các API và chờ cho tất cả chúng hoàn tất
        const [categories, products, orders, orderDetails] = await Promise.all([
            fetchData("categories"),
            fetchData("products"),
            fetchData("orders"),
            fetchData("order_details")
        ]);

        // Hiển thị danh sách danh mục trong bảng
        displayCategories(categories);

        // Thực hiện các hàm hiển thị sản phẩm và đơn hàng dựa trên dữ liệu đã nhận được
        renderDisplayProducts(products, categories);
        // renderOrders(orders, orderDetails);

        renderOrdersDisplay(products, orders, orderDetails);

        renderUserDisplay(orders);

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
});


// ! Sử lý CRUD danh mục
const handleCategoryForm = document.querySelector(".form-category");
const handleCategoryEditForm = document.querySelector(".formEdit-Category");

// *Hàm để hiển thị danh sách danh mục
const displayCategories = async (categories) => {
    categories = categories.filter(category => category !== null);

    const categoriesTableBody = document.getElementById("categoriesTableBody");

    // Sắp xếp danh sách danh mục
    categories.sort((a, b) => b.id - a.id);

    // Xóa nội dung cũ của tbody
    categoriesTableBody ? categoriesTableBody.innerHTML = "" : " ";

    // Thêm từng danh mục vào tbody
    await categories.forEach((category, index) => {
        const html = `
            <tr data-id='${category.id}'>
                <th scope="row">${category.id}</th>
                <td>${category.title}</td>
                <td class="w-3">
                    <a href="/cate-edit" class="btn-edit" data-id="${category.id}"><i class="fa-solid fa-pen-to-square"></i></a>
                </td>
                <td class="w-3">
                <a class="btn-del" data-id="${category.id}" data-title="${category.title}">
                  <i class="fa-solid fa-trash"></i>
                </a>
                </td>
            </tr>
        `;
        categoriesTableBody ? categoriesTableBody.innerHTML += html : " ";
    });


    // * Xử lý sự kiện click nút sửa
    const editButtons = document.querySelectorAll('.btn-edit');
    editButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const categoryId = e.currentTarget.getAttribute('data-id');
            if (categoryId) {
                // Chuyển hướng đến trang /cate-edit với ID categoryId
                window.location.href = `/cate-edit?id=${categoryId}`;

                console.log(window.location.href = `/cate-edit?id=${categoryId}`);
            } else {
                console.log('CategoryId is null or undefined');
            }
        });
    });


    // * Xử lý sự kiện click nút xóa
    const deleteButtons = document.querySelectorAll('.btn-del');
    deleteButtons.forEach((btn) => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const categoryId = this.getAttribute('data-id');
            const categoryTitle = this.getAttribute('data-title');
            const confirmMessage = `Bạn có chắc muốn xóa danh mục với tên "${categoryTitle}" không?`;

            // Hiển thị hộp thoại xác nhận
            if (confirm(confirmMessage)) {
                const trElement = this.closest('tr');

                if (categoryId && trElement) {
                    try {
                        // Gửi yêu cầu GET để lấy danh sách các khóa trong object
                        const response = await axios.get(`${API_URL}categories.json`, {
                            params: {
                                orderBy: '"id"',
                                equalTo: categoryId,
                                print: "pretty"
                            }
                        });

                        const categoryData = response.data;

                        if (categoryData) {
                            // Lặp qua danh sách các khóa (keys) trong object
                            for (const categoryIdKey in categoryData) {
                                if (categoryData.hasOwnProperty(categoryIdKey)) {
                                    // Gửi yêu cầu DELETE để xóa từng danh mục
                                    await axios.delete(`${API_URL}categories/${categoryIdKey}.json`);
                                    console.log(`Deleted category with ID: ${categoryIdKey}`);
                                }
                            }

                            // Xóa thẻ <tr> khỏi DOM
                            trElement.remove();
                        } else {
                            console.log('Category data not found');
                        }
                    } catch (error) {
                        console.log(error.message);
                    } finally {
                        // Kích hoạt lại nút xóa sau khi hoàn thành yêu cầu
                        this.disabled = false;
                    }
                }

            } else {
                // Người dùng đã hủy xác nhận
                console.log('Delete cancelled');
            }
        });
    });

    // deleteButtons.forEach((btn) => {
    //     btn.addEventListener('click', async function (e) {
    //         e.preventDefault();
    //         const categoryId = this.getAttribute('data-id');
    //         const categoryTitle = this.getAttribute('data-title');
    //         const confirmMessage = `Bạn có chắc muốn xóa danh mục với tên "${categoryTitle}" không?`;

    //         // Hiển thị hộp thoại xác nhận
    //         if (confirm(confirmMessage)) {
    //             const trElement = this.closest('tr');

    //             if (categoryId && trElement) {
    //                 try {
    //                     // Tạm thời vô hiệu hóa nút xóa
    //                     this.disabled = true;

    //                     await axios.delete(`${API_URL}categories/`);
    //                     // Xóa thẻ <tr> khỏi DOM
    //                     trElement.remove();
    //                 } catch (error) {
    //                     console.log(error.message);
    //                 } finally {
    //                     // Kích hoạt lại nút xóa sau khi hoàn thành yêu cầu
    //                     this.disabled = false;
    //                 }
    //             }
    //         } else {
    //             // Người dùng đã hủy xác nhận
    //             console.log('Delete cancelled');
    //         }
    //     });
    // });

    // *Chỗ xử lý tạo danh mục mới
    handleCategoryForm ? handleCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const msgError = document.getElementById('categoryError');

        try {
            const currentData = await axios.get(`${API_URL}categories.json`);
            const currentCategories = Object.values(currentData.data || {});
            console.log(currentCategories);

            const nextId = currentCategories.length > 0 ? Math.max(...currentCategories.map(category => Number(category.id))) + 1 : 1;

            // Sử dụng hàm set để gửi yêu cầu với ID được xác định trước
            await axios.put(`${API_URL}categories/${nextId - 4}.json`, {
                id: nextId,
                title: title
            });

            console.log('Added new category with ID:', nextId);
            showAlertAndRedirect("Thêm danh mục mới thành công", "/cate-list");

            await setTimeout(() => {
                window.location.href = `/cate-list`;
            }, 1500);
        } catch (error) {
            console.error('Error adding new category:', error.message);
        }
    }) : "";



    // handleCategoryForm ? handleCategoryForm.addEventListener('submit', async (e) => {
    //     e.preventDefault();

    //     const title = document.getElementById('title').value.trim();
    //     const msgError = document.getElementById('categoryError');

    //     // Kiểm tra xem categoryName có trống không
    //     if (!title) {
    //         msgError.innerHTML = '<span class="text-danger">Tên danh mục không được để trống</span>';
    //         return;
    //     } else {
    //         msgError.innerHTML = '';
    //         categoryError.innerHTML = '<span class="text-success">Thêm danh mục thành công</span>';
    //     }

    //     try {
    //         await axios.post(`${API_URL}categories`, {
    //             title: title
    //         });
    //         console.log('Added new category');
    //         showAlertAndRedirect("Thêm danh mục mới thành công", "/cate-list")

    //         await setTimeout(() => {
    //             window.location.href = `/cate-list`;
    //         }, 1500)
    //     } catch (error) {
    //         console.log(error.message);
    //     }

    // }) : "";
};


//* Chỗ xử lý sửa thông tin danh mục
document.addEventListener("DOMContentLoaded", async function () {
    // Lấy id từ tham số truyền vào URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('id');

    if (categoryId) {
        try {
            const response = await axios.get(`${API_URL}categories.json`, {
                params: {
                    orderBy: '"id"',
                    equalTo: categoryId,
                    print: "pretty"
                }
            });

            const categoryData = response.data;

            // Hiển thị dữ liệu trong các ô input
            if (categoryData && Object.keys(categoryData).length > 0) {
                const categoryIdKey = Object.keys(categoryData)[0];
                const category = categoryData[categoryIdKey];

                document.getElementById('title').value = category.title;
                // Các ô input khác tương tự
            } else {
                console.log('Category data not found');
            }
        } catch (error) {
            console.log(error.message);
        }
    } else {
        console.log('CategoryId is null or undefined');
    }



    // * Edit Category
    handleCategoryEditForm ? handleCategoryEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const msgError = document.getElementById('categoryError');

        if (!title) {
            msgError.innerHTML = '<span class="text-danger">Tên danh mục không được để trống</span>';
            return;
        } else {
            msgError.innerHTML = '';

            try {
                // Lấy danh sách các danh mục từ API
                const response = await axios.get(`${API_URL}categories.json`, {
                    params: {
                        orderBy: '"id"',
                        equalTo: categoryId,
                        print: "pretty"
                    }
                });

                const categoryData = response.data;

                // Kiểm tra xem categoryData có dữ liệu và có category với id tương ứng không
                if (categoryData && Object.keys(categoryData).length > 0) {
                    const categoryIdKey = Object.keys(categoryData)[0];
                    const category = categoryData[categoryIdKey];

                    // Sử dụng phương thức PATCH để cập nhật danh mục
                    await axios.patch(`${API_URL}categories/${categoryIdKey}.json`, {
                        title: title
                    });

                    console.log('Updated category');
                    showAlertAndRedirect(`Cập nhật danh mục "${title}" thành công`, "/cate-list");
                } else {
                    console.log('Category data not found');
                }
            } catch (error) {
                console.log(error.message);
            }
        }
    }) : "";

});




// ! Sử lý CRUD sản phẩm
const handleProductForm = document.querySelector(".form-product");
const handleProductEditForm = document.querySelector(".formEdit-Product");

const renderDisplayProducts = async (products, categories) => {
    console.log(products);

    products = products.filter(product => product !== null);

    const productsTableBody = document.getElementById("productsTableBody");

    // Sắp xếp danh sách sản phẩm
    products.sort((a, b) => b.id - a.id);

    // Xóa nội dung cũ của tbody
    productsTableBody ? productsTableBody.innerHTML = "" : " ";

    // Thêm từng danh mục vào tbody
    await products.forEach((product, index) => {
        const imageUrl = product.image ? `/img/${product.image}` : "";
        const viPrice = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        });

        const category = categories.find((cat) => cat.id === product.cate_id);
        const categoryName = category ? category.title : "Unknown Category";

        const price = product.price;
        const formattedPrice = viPrice.format(price);
        const html = `
         <tr data-id='${product.id}'>
            <th scope="row">${product.id}</th>
            <td>${product.name}</td>
            <td align="center"><img src="${imageUrl}" alt="IMG" width="80"></td>
            <td>${formattedPrice}</td>
            <td>${categoryName}</td>
            <td class="w-3">
                <a href="/product-edit" class="btn-pro-edit" data-id='${product.id}'><i class="fa-solid fa-pen-to-square"></i></a>
            </td>
            <td class="w-3"> <a class="btn-pro-del" data-id='${product.id}' data-title='${product.name}'><i class="fa-solid fa-trash"></i></a>
            </td>
        </tr>
        `;
        productsTableBody ? productsTableBody.innerHTML += html : " ";
    });


    // * Xử lý sự kiện click nút sửa
    const editButtons = document.querySelectorAll('.btn-pro-edit');
    editButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = e.currentTarget.getAttribute('data-id');
            console.log(productId);
            // Chuyển hướng hoặc thực hiện các thao tác cần thiết để sửa danh mục với ID productId
            if (productId) {
                // Chuyển hướng đến trang /product-edit với ID productId
                window.location.href = `/product-edit?id=${productId}`;
            } else {
                console.log('productId is null or undefined');
            }
        });
    });


    // * Xử lý sự kiện click nút xóa

    const deleteButtons = document.querySelectorAll('.btn-pro-del');
    deleteButtons.forEach((btn) => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const productID = this.getAttribute('data-id');
            const productName = this.getAttribute('data-title');
            const confirmMessage = `Bạn có chắc muốn xóa sản phẩm với tên "${productName}" không?`;

            // Hiển thị hộp thoại xác nhận
            if (confirm(confirmMessage)) {
                // Thực hiện xóa nếu người dùng xác nhận
                const trElement = this.closest('tr');

                if (productID && trElement) {
                    try {
                        // Gửi yêu cầu GET để lấy dữ liệu sản phẩm
                        const response = await axios.get(`${API_URL}products.json`, {
                            params: {
                                orderBy: '"id"',
                                equalTo: productID,
                                print: "pretty"
                            }
                        });

                        const productData = response.data;

                        if (productData) {
                            // Lấy danh sách các khóa (keys) trong object
                            const productKeys = Object.keys(productData);

                            if (productKeys.length > 0) {
                                // Lấy ID đầu tiên từ danh sách khóa
                                const firstProductID = productKeys[0];

                                // Gửi yêu cầu DELETE để xóa sản phẩm
                                await axios.delete(`${API_URL}products/${firstProductID}.json`);

                                // Sau khi xóa thành công, có thể cập nhật giao diện hoặc làm các thao tác khác cần thiết
                                console.log(`Deleted product with ID: ${firstProductID}`);
                                // Xóa thẻ <tr> khỏi DOM
                                trElement.remove();
                            } else {
                                console.log('No product data found');
                            }
                        } else {
                            console.log('Product data not found');
                        }
                    } catch (error) {
                        console.log(error.message);
                    } finally {
                        // Kích hoạt lại nút xóa sau khi hoàn thành yêu cầu
                        this.disabled = false;
                    }
                }
            } else {
                // Người dùng đã hủy xác nhận
                console.log('Delete cancelled');
            }
        });
    });


    // const deleteButtons = document.querySelectorAll('.btn-pro-del');
    // deleteButtons.forEach((btn) => {
    //     btn.addEventListener('click', async function (e) {
    //         e.preventDefault();
    //         const productID = this.getAttribute('data-id');
    //         const productName = this.getAttribute('data-title');
    //         const confirmMessage = `Bạn có chắc muốn xóa danh mục với tên "${productName}" không?`;

    //         // Hiển thị hộp thoại xác nhận
    //         if (confirm(confirmMessage)) {
    //             // Thực hiện xóa nếu người dùng xác nhận
    //             const trElement = this.closest('tr');

    //             if (productID && trElement) {
    //                 try {
    //                     // Tạm thời vô hiệu hóa nút xóa
    //                     this.disabled = true;

    //                     await axios.delete(`${API_URL}products/${productID}`);
    //                     // Sau khi xóa thành công, có thể cập nhật giao diện hoặc làm các thao tác khác cần thiết
    //                     console.log(`Deleted product with ID: ${productID}`);
    //                     // Xóa thẻ <tr> khỏi DOM
    //                     trElement.remove();
    //                 } catch (error) {
    //                     console.log(error.message);
    //                 } finally {
    //                     // Kích hoạt lại nút xóa sau khi hoàn thành yêu cầu
    //                     this.disabled = false;
    //                 }
    //             }
    //         } else {
    //             // Người dùng đã hủy xác nhận
    //             console.log('Delete cancelled');
    //         }
    //     });
    // });

    //* Sử lý chức năng create product

    // Chỗ xử lý việc show sản phẩm sau khi upload
    const showImage = () => {
        const inputImage = document.getElementById('formFileMultiple');
        inputImage ? inputImage.addEventListener('change', () => {
            // Kiểm tra xem đã chọn file hay chưa
            if (inputImage.files.length > 0) {
                const image = inputImage.files.item(0).name;
                console.log(image);
                document.getElementById('showImage').innerHTML = `<img src="/img/${image}" alt="" width="120">`;
            }
        }) : "";
    };

    window.onload(loadCategories());

    // Thêm sự kiện lắng nghe cho form thêm sản phẩm
    handleProductForm ? handleProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('inputProduct').value.trim();
        const price = document.getElementById('inputPrice').value.trim();
        const detail = document.getElementById('summernote').value;
        const fileInput = document.getElementById('formFileMultiple');
        const selectedFile = fileInput.files[0];

        const productErr = document.querySelector('.productError');
        const imgtErr = document.querySelector('.imgError');
        const priceErr = document.querySelector('.priceError');
        const catetErr = document.querySelector('.cateError');

        productErr.innerHTML = '';
        imgtErr.innerHTML = '';
        priceErr.innerHTML = '';
        catetErr.innerHTML = '';

        // Gọi hàm loadCategories để tải danh sách danh mục (nếu cần)
        await loadCategories();

        // Sử dụng selectedValue từ module
        selectedValue;
        // Kiểm tra xem các trường có đúng giá trị không và hiển thị lỗi nếu cần
        let hasError = false;

        const isValidName = (name) => {
            const regex = /^[a-zA-Z0-9\s!@#\$%\^\&*\)\(+=._-]{2,}$/; // Regex here
            return regex.test(removeAscent(name));
        };

        if (!name) {
            productErr.innerHTML = '<span class="text-danger">Tên sản phẩm không được để trống</span>';
            hasError = true;
        } else if (!isValidName(name)) {
            productErr.innerHTML = '<span class="text-danger">Tên sản phẩm không hợp lệ</span>';
            hasError = true;
        }

        // Kiểm tra xem giá có phải là số dương hay không
        if (!price || isNaN(price) || parseFloat(price) <= 0) {
            priceErr.innerHTML = '<span class="text-danger">Giá không hợp lệ</span>';
            hasError = true;
        }

        // Kiểm tra xem giá trị đã chọn trong dropdown có phải là rỗng hay không
        if (!selectedValue) {
            catetErr.innerHTML = '<span class="text-danger">Vui lòng chọn danh mục</span>';
            hasError = true;
        }

        // Kiểm tra xem tệp tin có được chọn hay không
        if (!selectedFile) {
            imgtErr.innerHTML = '<span class="text-danger">Hình ảnh không được để trống</span>';
            hasError = true;
        } else {
            // Kiểm tra loại tệp tin, ví dụ chỉ cho phép ảnh
            const allowedExtensions = /\.(jpg|jpeg|png|gif)$/i;
            if (!allowedExtensions.test(selectedFile.name)) {
                imgtErr.innerHTML = '<span class="text-danger">Chỉ chấp nhận định dạng ảnh (jpg, jpeg, png, gif)</span>';
                hasError = true;
            }
        }

        const inputImage = selectedFile.name;

        // Thực hiện các thao tác cần thiết khi thông tin hợp lệ
        if (!hasError) {
            try {
                const currentData = await axios.get(`${API_URL}products.json`);
                let currentProducts = Object.values(currentData.data || {});

                // Lọc ra các sản phẩm có giá trị không phải null
                currentProducts = currentProducts.filter(product => product !== null);

                const nextId = currentProducts.length > 0 ? Math.max(...currentProducts.map(product => Number(product.id))) + 1 : 1;


                // Tiếp tục xử lý, ví dụ: gửi yêu cầu đến server để thêm sản phẩm
                await axios.put(`${API_URL}products/${nextId}.json`, {
                    id: nextId,
                    name: name,
                    image: inputImage,
                    price: price,
                    cate_id: parseInt(selectedValue),
                    detail: detail,
                });

                // Sau khi thêm sản phẩm thành công, có thể chuyển hướng hoặc làm các thao tác khác cần thiết
                console.log('Added new product');
                showAlertAndRedirect("Thêm sản phẩm thành công", "/product-list");

                // Tải lại danh sách sản phẩm sau khi thêm mới
                await loadProducts();
            } catch (error) {
                console.log(error.message);
            }

        }
    }) : "";


    // Gọi hàm showImage để kích hoạt sự kiện change
    showImage();

}

document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        try {
            const response = await axios.get(`${API_URL}products.json`, {
                params: {
                    orderBy: '"id"',
                    equalTo: productId,
                    print: "pretty"
                }
            });

            const productData = response.data;
            const productsArray = Object.values(productData);

            // Nếu bạn chỉ muốn lấy thông tin của sản phẩm đầu tiên trong mảng (trong trường hợp này, chỉ có một sản phẩm)
            const firstProduct = productsArray[0];

            if (firstProduct) {

                document.getElementById('inputProduct').value = firstProduct.name;
                document.getElementById('inputPrice').value = firstProduct.price;

                // Sử dụng phương thức của Summernote để cập nhật giá trị
                $('.summernote').summernote('code', firstProduct.detail);

                document.getElementById('previewImage').innerHTML = `
                    <span>Hình cũ: </span>
                    <img src="/img/${firstProduct.image}" alt="" width="120">`;

                // Lấy tên của danh mục dựa trên cate_id
                const categoryName = await getCategoryName(firstProduct.cate_id);
                document.getElementById('priviewOldCategory').innerText = categoryName;

            } else {
                console.log('Product data not found');
            }
        } catch (error) {
            console.log(error.message);
        }
    } else {
        console.log('productId is null or undefined');
    }

    // Khởi tạo Summernote trên tất cả các thẻ có class 'summernote'
    $('.summernote').summernote();

    // Hàm để lấy tên danh mục dựa trên cate_id
    async function getCategoryName(cateId) {
        try {
            const response = await axios.get(`${API_URL}categories.json`, {
                params: {
                    orderBy: '"id"',
                    equalTo: cateId,
                    print: "pretty"
                }
            });
            const categoryData = response.data;
            const categorieArray = Object.values(categoryData);

            // Nếu bạn chỉ muốn lấy thông tin của sản phẩm đầu tiên trong mảng (trong trường hợp này, chỉ có một sản phẩm)
            const firstCategory = categorieArray[0];
            return firstCategory ? firstCategory.title : "Unknown Category";
        } catch (error) {
            console.log(`Error fetching category data for id ${cateId}: ${error.message}`);
            return "Unknown Category";
        }
    }



    async function getProductData(productId) {
        try {
            const response = await axios.get(`${API_URL}products.json`, {
                params: {
                    orderBy: '"id"',
                    equalTo: productId,
                    print: "pretty"
                }
            });

            return response.data;
        } catch (error) {
            console.log(`Error fetching product data for id ${productId}: ${error.message}`);
            return null;
        }
    }
    // * Sửa thông tin sản phẩm
    handleProductEditForm ? handleProductEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const productData = await getProductData(productId);
        const productsArray = Object.values(productData);

        // Nếu bạn chỉ muốn lấy thông tin của sản phẩm đầu tiên trong mảng (trong trường hợp này, chỉ có một sản phẩm)
        const firstProduct = productsArray[0];
        console.log('firstProduct', firstProduct);



        const name = document.getElementById('inputProduct').value.trim();
        const price = document.getElementById('inputPrice').value.trim();
        const detail = document.getElementById('summernote').value;
        const fileInput = document.getElementById('formFileMultiple');
        const selectedFile = fileInput.files[0];

        const productErr = document.querySelector('.productError');
        const imgtErr = document.querySelector('.imgError');
        const priceErr = document.querySelector('.priceError');
        const catetErr = document.querySelector('.cateError');

        // Gọi hàm loadCategories để tải danh sách danh mục (nếu cần)
        await loadCategories();

        // Kiểm tra xem các trường có đúng giá trị không và hiển thị lỗi nếu cần
        let hasError = false;

        const isValidName = (name) => {
            const regex = /^[a-zA-Z0-9\s!@#\$%\^\&*\)\(+=._-]{2,}$/; // Regex here
            return regex.test(removeAscent(name));
        };

        if (!name) {
            productErr.innerHTML = '<span class="text-danger">Tên sản phẩm không được để trống</span>';
            hasError = true;

        } else if (!isValidName(name)) {
            productErr.innerHTML = '<span class="text-danger">Tên sản phẩm không hợp lệ</span>';
            hasError = true;
        }
        // Kiểm tra xem giá có phải là số dương hay không
        if (!price || isNaN(price) || parseFloat(price) <= 0) {
            priceErr.innerHTML = '<span class="text-danger">Giá không hợp lệ</span>';
            hasError = true;
        }



        // Kiểm tra xem tệp tin có được chọn hay không
        if (selectedFile) {
            // Kiểm tra loại tệp tin, ví dụ chỉ cho phép ảnh
            const allowedExtensions = /\.(jpg|jpeg|png|gif)$/i;
            if (!allowedExtensions.test(selectedFile.name)) {
                imgtErr.innerHTML = '<span class="text-danger">Chỉ chấp nhận định dạng ảnh (jpg, jpeg, png, gif)</span>';
                hasError = true;
            }
        }

        // Lấy giá trị option đã chọn
        const selectValueCate = selectedValue || firstProduct.cate_id;

        // Biến để kiểm tra xem người dùng đã chọn danh mục mới hay không
        let updatedCategory = false;

        if (selectValueCate) {
            updatedCategory = true;
        }

        // Lấy giá trị ảnh đã chọn
        const selectValueImage = selectedFile ? selectedFile.name : null;

        // Biến để kiểm tra xem người dùng đã chọn ảnh mới hay không
        let updatedImage = false;

        if (selectValueImage) {
            updatedImage = true;
        }



        if (!hasError) {
            try {
                if (updatedCategory || updatedImage) {
                    await axios.patch(`${API_URL}products/${productId}.json`, {
                        name: name,
                        image: selectValueImage || firstProduct.image,
                        price: price,
                        cate_id: parseInt(selectValueCate),
                        detail: detail
                    });
                } else {
                    await axios.patch(`${API_URL}products/${productId}.json`, {
                        name: name,
                        image: firstProduct.image,
                        price: price,
                        cate_id: firstProduct.cate_id,
                        detail: detail
                    });
                }

                console.log('Updated product');
                showAlertAndRedirect(`Cập nhật sản phẩm "${name}" thành công`, "/product-list");
            } catch (error) {
                console.log(error.message);
            }

        }

    }) : "";

});


//! Quản lý thống kê

document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Gọi API để lấy danh mục và sản phẩm
        const categoriesPromise = axios.get(`${API_URL}categories.json`);
        const productsPromise = axios.get(`${API_URL}products.json`);

        // Chờ cả hai Promise hoàn thành
        const [categoriesResponse, productsResponse] = await Promise.all([categoriesPromise, productsPromise]);

        const categories = categoriesResponse.data;
        // Trước khi sử dụng productsResponse.data, lọc bỏ các phần tử có giá trị null
        const products = productsResponse.data.filter(product => product !== null);

        // Tiếp tục xử lý với mảng products đã lọc
        const categoryStats = calculateCategoryStats(categories, products);


        // Hiển thị dữ liệu lên bảng HTML
        displayStatsOnTable(categoryStats);
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
});


// Hàm tính toán thông kê theo danh mục
function calculateCategoryStats(categories, products) {
    const categoryStats = [];

    // Sắp xếp thông tin thống kê từ mới đến cũ
    categories.sort((a, b) => b.id - a.id);

    categories.forEach((category) => {
        // Lọc ra các sản phẩm có cate_id và khác null
        const productsInCategory = products.filter(product => product.cate_id === category.id);

        if (productsInCategory.length > 0 && category.id && category.title) {
            // Chuyển đổi giá sản phẩm thành số và loại bỏ ký tự không mong muốn
            const prices = productsInCategory.map(product => Number(product.price.replace(/[^0-9.-]+/g, '')));

            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);

            // Giữ 3 chữ số thập phân
            const avgPrice = Number((prices.reduce((total, price) => total + price, 0) / prices.length).toFixed(3));

            categoryStats.push({
                categoryId: category.id,
                categoryName: category.title,
                maxPrice,
                minPrice,
                avgPrice,
            });
        }
    });

    return categoryStats;
}

// Hàm hiển thị dữ liệu lên bảng HTML
function displayStatsOnTable(categoryStats) {
    const tableBody = document.getElementById("statics_form");

    let html = "";

    categoryStats.forEach((category, index) => {
        const viPrice = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        });

        const formattedMaxPrice = viPrice.format(category.maxPrice);
        const formattedMinPrice = viPrice.format(category.minPrice);
        const formattedAvgPrice = viPrice.format(category.avgPrice);

        html += `
            <tr>
                <th scope="row">${category.categoryId}</th>
                <td>${category.categoryName}</td>
                <td>${formattedMaxPrice}</td>
                <td>${formattedMinPrice}</td>
                <td>${formattedAvgPrice}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}


