# Dual-Contouring-javascript-implementation

**Progress so far**: Octree subdivision works correctly and will be integrated with isosurface extraction in the following days

![Screenshot](/screenshots/octree3.png)

This javascript implementation takes [Nick's excellent explanations](http://ngildea.blogspot.it/2014/11/implementing-dual-contouring.html) on the inner workings of the algorithm and expands it further in the topics he didn't discuss in depth, such as ContourCellProc's routines and the global variables of the original octree structure  of Tao Ju.

Since a blog post can't be a book, and considering the sheer amount of explanations required to fully grasp the algorithm, he omitted an in depth explanations on the inner isosurface extraction routines which will be discussed here along with a simple implementation of the algorithm in javascript togheter with a raw WebGL renderer to output the extraction results.

This particular repo won't include build files until completion given the nature of the project itself, which requires reading multiple separate classes to get a grip on how everything works togheter
